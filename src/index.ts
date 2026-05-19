import { pushLists } from './api.ts';
import { DEBOUNCE_MS, DEV_GIST_ID, DEV_TOKEN } from './constants.ts';
import { interceptListStorage } from './intercept.ts';
import { getListsFromStorage, type GistConfig } from './storage.ts';
import { debounce, getSnapshot, getSyncableLists, isDirty, markSynced } from './sync.ts';

function init(): void {
  const config: GistConfig = { gistId: DEV_GIST_ID, token: DEV_TOKEN };
  // if (config === null) {
  //   console.warn('[psnpp-gist] no token/gist ID');
  //   return;
  // }

  const debouncedSync = debounce(async () => {
    const lists = getListsFromStorage();
    const syncable = getSyncableLists(lists);
    const snapshot = getSnapshot(syncable);

    console.log(`[psnpp-gist] ${lists.length} total, ${syncable.length} syncable:`);
    for (const list of syncable) {
      console.log(`  "${list.name}": ${list.games.length} games`);
    }

    if (!isDirty(snapshot)) {
      console.log('[psnpp-gist] no changes, skipping');
      return;
    }

    console.log('[psnpp-gist] pushing to Gist...');
    await pushLists(syncable, config.gistId, config.token);
    markSynced(snapshot);
    console.log('[psnpp-gist] synced');
  }, DEBOUNCE_MS);

  interceptListStorage(debouncedSync);
}

init();
