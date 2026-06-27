import { fetchManifest, pullFile } from "../api.ts";
import { LISTS_KEY } from "../constants.ts";
import type { IGistEntry, SyncState } from "../types.ts";
import { createList, getListsFromStorage, snapshotKey } from "../storage.ts";
import { getListSnapshot, isKeyDirty, markKeySynced } from "./utils.ts";

export function setupPull(state: SyncState): void {
  // re-pull on tab focus if gist updated
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || state.config === null) return;

    for (const entry of state.config.gists) {
      void fetchManifest(entry.id, state.config.token).then(
        ({ gistUpdatedAt }) => {
          const last = state.lastPulledAt[entry.id];
          if (last !== undefined && gistUpdatedAt > last) {
            console.log(`[psnpp-gist] ${entry.id} updated, re-pulling...`);
            void pullEntry(state, entry);
          }

          state.lastPulledAt[entry.id] = gistUpdatedAt;
        },
        (e: unknown) => {
          console.warn("[psnpp-gist] visibility check failed:", e);
        },
      );
    }
  });
}

export async function pullEntry(state: SyncState, entry: IGistEntry): Promise<string | null> {
  if (state.config === null) return null;

  const { manifest, scopeWarning, gistUpdatedAt } = await fetchManifest(
    entry.id,
    state.config.token,
  );
  if (manifest !== null) {
    state.cachedManifest[entry.id] = manifest;
    state.lastPulledAt[entry.id] = gistUpdatedAt;
  }

  for (const uuid of entry.files) {
    const pulled = await pullFile(entry.id, uuid, state.config.token);
    if (pulled === null) continue;

    const localId = state.registry[`${entry.id}:${uuid}`];
    const key = snapshotKey(entry.id, uuid);

    if (localId === null || localId === undefined) {
      // no local list
      createList({ ...pulled, id: uuid });
      state.registry[`${entry.id}:${uuid}`] = uuid;
      markKeySynced(key, getListSnapshot(pulled));
      console.log(`[psnpp-gist] created local list from ${uuid}`);
    } else {
      // gist wins on conflict
      const snap = getListSnapshot(pulled);
      if (isKeyDirty(key, snap)) {
        console.log(`[psnpp-gist] pulling ${uuid}...`);
        state.suppressSync = true;

        const all = getListsFromStorage();
        const idx = all.findIndex(l => l.id === localId);
        if (idx !== -1) {
          all[idx] = { ...pulled, id: localId };
          localStorage.setItem(LISTS_KEY, JSON.stringify(all));
        }

        state.suppressSync = false;
        markKeySynced(key, snap);
      }
    }
  }

  return scopeWarning;
}
