import { GistApiError, fetchManifest, pullFile, pushFiles, deleteFile } from "./api.ts";
import { DEBOUNCE_MS, LISTS_KEY } from "./constants.ts";
import type { IList } from "./types.ts";
import { waitForElement } from "./dom.ts";
import { setupSettings } from "./settings.ts";
import {
  buildRegistry,
  createList,
  getListsFromStorage,
  loadGistConfigState,
  onStorageEffect,
  onStorageRemove,
  snapshotKey,
} from "./storage.ts";
import type { GistConfig, GistEntry, GistRegistry } from "./storage.ts";
import { debounce, getListSnapshot, isKeyDirty, markKeySynced } from "./sync.ts";
import { injectStatusIndicator, markGistLists } from "./ui.ts";
import type { SyncStatus } from "./ui.ts";

const configState = loadGistConfigState();
const config: GistConfig | null = configState.status === "ok" ? configState.config : null;
const registry: GistRegistry = config !== null ? buildRegistry(config) : {};
const cachedManifest: Record<string, Record<string, string>> = {};
const lastPulledAt: Record<string, string> = {};

console.log(
  `[psnpp-gist] init | config: ${configState.status} | tracking: ${Object.keys(registry).length} files`,
);

let updateStatus: (status: SyncStatus, detail?: string) => void = () => {};
let suppressSync = false;

function handleApiError(e: unknown, gistId: string): void {
  if (e instanceof GistApiError) {
    const err = e.error;
    if (err.kind === "forbidden") {
      const entry = config?.gists.find(g => g.id === gistId);
      if (entry !== undefined) {
        entry.readOnly = true;
      }
    }
  }

  console.warn("[psnpp-gist] api error:", e);
  updateStatus("error", String(e instanceof Error ? e.message : e));
}

const debouncedSync = debounce(async () => {
  if (config === null) return;

  for (const entry of config.gists) {
    if (entry.readOnly === true) continue;

    const all = getListsFromStorage();
    const dirtyFiles: Record<string, IList> = {};
    const manifest = { ...cachedManifest[entry.id] };

    for (const uuid of entry.files) {
      const local = all.find(l => l.id === uuid);
      if (local === undefined) continue;

      const key = snapshotKey(entry.id, uuid);
      const snap = getListSnapshot(local);
      if (isKeyDirty(key, snap)) {
        dirtyFiles[uuid] = local;
        manifest[uuid] = local.name;
      }
    }

    const dirtyUuids = Object.keys(dirtyFiles);
    if (dirtyUuids.length === 0) continue;

    console.log(`[psnpp-gist] pushing ${dirtyUuids.length} files to ${entry.id}`);
    updateStatus("syncing");

    try {
      await pushFiles(entry.id, dirtyFiles, manifest, config.token);
      cachedManifest[entry.id] = manifest;

      for (const [uuid, list] of Object.entries(dirtyFiles)) {
        markKeySynced(snapshotKey(entry.id, uuid), getListSnapshot(list));
      }

      updateStatus("synced");
      console.log("[psnpp-gist] synced");
    } catch (e) {
      handleApiError(e, entry.id);
    }
  }
}, DEBOUNCE_MS);

onStorageEffect(LISTS_KEY, () => {
  if (!suppressSync) debouncedSync();
});

onStorageRemove(LISTS_KEY, () => {
  if (config === null) return;

  for (const entry of config.gists) {
    if (entry.readOnly === true) continue;

    for (const uuid of [...entry.files]) {
      const key = `${entry.id}:${uuid}`;
      const localId = registry[key];
      if (localId === undefined) continue;

      // check if list was actually deleted
      const still = getListsFromStorage().find(l => l.id === localId);
      if (still !== undefined) continue;

      const manifest = { ...cachedManifest[entry.id] };
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete manifest[uuid];

      void deleteFile(entry.id, uuid, manifest, config.token).then(
        () => {
          cachedManifest[entry.id] = manifest;
          entry.files = entry.files.filter(f => f !== uuid);
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete registry[key];
          console.log(`[psnpp-gist] deleted ${uuid} from ${entry.id.slice(0, 8)}`);
        },
        (e: unknown) => {
          handleApiError(e, entry.id);
        },
      );
    }
  }
});

setupSettings();

async function pullEntry(entry: GistEntry, token: string): Promise<string | null> {
  const { manifest, scopeWarning, gistUpdatedAt } = await fetchManifest(entry.id, token);
  if (manifest !== null) {
    cachedManifest[entry.id] = manifest;
    lastPulledAt[entry.id] = gistUpdatedAt;
  }

  for (const uuid of entry.files) {
    const pulled = await pullFile(entry.id, uuid, token);
    if (pulled === null) continue;

    const localId = registry[`${entry.id}:${uuid}`];
    const key = snapshotKey(entry.id, uuid);

    if (localId === null || localId === undefined) {
      // no local list
      createList({ ...pulled, id: uuid });
      registry[`${entry.id}:${uuid}`] = uuid;
      markKeySynced(key, getListSnapshot(pulled));
      console.log(`[psnpp-gist] created local list from ${uuid}`);
    } else {
      // gist wins on conflict
      const snap = getListSnapshot(pulled);
      if (isKeyDirty(key, snap)) {
        console.log(`[psnpp-gist] pulling ${uuid}...`);
        suppressSync = true;

        const all = getListsFromStorage();
        const idx = all.findIndex(l => l.id === localId);
        if (idx !== -1) {
          all[idx] = { ...pulled, id: localId };
          localStorage.setItem(LISTS_KEY, JSON.stringify(all));
        }

        suppressSync = false;
        markKeySynced(key, snap);
      }
    }
  }

  return scopeWarning;
}

async function initGameListsPage(): Promise<void> {
  try {
    await waitForElement("label.select select");
  } catch {
    return;
  }

  if (configState.status === "none") return;

  if (configState.status === "partial") {
    updateStatus = injectStatusIndicator();
    updateStatus("error", configState.message);
    return;
  }

  if (config === null || config.gists.length === 0) return;

  updateStatus = injectStatusIndicator();
  markGistLists(registry);
  updateStatus("syncing");

  let lastScopeWarning: string | null = null;

  try {
    for (const entry of config.gists) {
      const warning = await pullEntry(entry, config.token);
      if (warning !== null) {
        lastScopeWarning = warning;
        console.warn("[psnpp-gist] scope warning:", warning);
      }
    }

    updateStatus("synced", lastScopeWarning ?? undefined);
  } catch (e) {
    console.warn("[psnpp-gist] pull failed:", e);
    updateStatus("error", String(e instanceof Error ? e.message : e));
  }
}

// re-pull on tab focus if gist updated
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || config === null) return;

  for (const entry of config.gists) {
    void fetchManifest(entry.id, config.token).then(
      ({ gistUpdatedAt }) => {
        const last = lastPulledAt[entry.id];
        if (last !== undefined && gistUpdatedAt > last) {
          console.log(`[psnpp-gist] ${entry.id} updated, re-pulling...`);
          void pullEntry(entry, config.token);
        }

        lastPulledAt[entry.id] = gistUpdatedAt;
      },
      (e: unknown) => {
        console.warn("[psnpp-gist] visibility check failed:", e);
      },
    );
  }
});

void initGameListsPage();
