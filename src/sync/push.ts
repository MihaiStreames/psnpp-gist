import { GistApiError, pushFiles, deleteFile } from "../api.ts";
import { DEBOUNCE_MS, LISTS_KEY } from "../constants.ts";
import type { IList, SyncState } from "../types.ts";
import { getListsFromStorage, onStorageEffect, onStorageRemove, snapshotKey } from "../storage.ts";
import { debounce, getListSnapshot, isKeyDirty, markKeySynced } from "./utils.ts";

function handleApiError(state: SyncState, e: unknown, gistId: string): void {
  if (e instanceof GistApiError) {
    const err = e.error;
    if (err.kind === "forbidden") {
      const entry = state.config?.gists.find(g => g.id === gistId);
      if (entry !== undefined) {
        entry.readOnly = true;
      }
    }
  }

  console.warn("[psnpp-gist] api error:", e);
  state.updateStatus("error", String(e instanceof Error ? e.message : e));
}

export function setupPush(state: SyncState): void {
  const debouncedSync = debounce(async () => {
    if (state.config === null) return;

    for (const entry of state.config.gists) {
      if (entry.readOnly === true) continue;

      const all = getListsFromStorage();
      const dirtyFiles: Record<string, IList> = {};
      const manifest = { ...state.cachedManifest[entry.id] };

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
      state.updateStatus("syncing");

      try {
        await pushFiles(entry.id, dirtyFiles, manifest, state.config.token);
        state.cachedManifest[entry.id] = manifest;

        for (const [uuid, list] of Object.entries(dirtyFiles)) {
          markKeySynced(snapshotKey(entry.id, uuid), getListSnapshot(list));
        }

        state.updateStatus("synced");
        console.log("[psnpp-gist] synced");
      } catch (e) {
        handleApiError(state, e, entry.id);
      }
    }
  }, DEBOUNCE_MS);

  onStorageEffect(LISTS_KEY, () => {
    if (!state.suppressSync) debouncedSync();
  });

  onStorageRemove(LISTS_KEY, () => {
    if (state.config === null) return;

    for (const entry of state.config.gists) {
      if (entry.readOnly === true) continue;

      for (const uuid of [...entry.files]) {
        const key = `${entry.id}:${uuid}`;
        const localId = state.registry[key];
        if (localId === undefined) continue;

        // check if list was actually deleted
        const still = getListsFromStorage().find(l => l.id === localId);
        if (still !== undefined) continue;

        const manifest = { ...state.cachedManifest[entry.id] };
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete manifest[uuid];

        void deleteFile(entry.id, uuid, manifest, state.config.token).then(
          () => {
            state.cachedManifest[entry.id] = manifest;
            entry.files = entry.files.filter(f => f !== uuid);
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete state.registry[key];
            console.log(`[psnpp-gist] deleted ${uuid} from ${entry.id.slice(0, 8)}`);
          },
          (e: unknown) => {
            handleApiError(state, e, entry.id);
          },
        );
      }
    }
  });
}
