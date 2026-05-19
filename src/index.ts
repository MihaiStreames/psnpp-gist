import { pullLists, pushLists } from './api.ts';
import { DEBOUNCE_MS, DEV_GIST_ID, DEV_TOKEN, SYNCED_LIST_NAMES } from './constants.ts';
import { interceptListStorage } from './intercept.ts';
import {
  applyPulledLists,
  ensureRegistered,
  getListsFromStorage,
  type GistConfig,
} from './storage.ts';
import { debounce, getSnapshot, getSyncableFromRegistry, isDirty, markSynced } from './sync.ts';

let suppressSync = false;

async function init(): Promise<void> {
  const config: GistConfig = { gistId: DEV_GIST_ID, token: DEV_TOKEN };
  const registry = ensureRegistered(SYNCED_LIST_NAMES);

  try {
    const pulled = await pullLists(config.gistId, config.token);
    const pulledSnapshot = getSnapshot(pulled);
    if (isDirty(pulledSnapshot)) {
      console.log('[psnpp-gist] pulling from Gist...');

      suppressSync = true;
      applyPulledLists(pulled, registry);
      suppressSync = false;

      markSynced(pulledSnapshot);
      console.log('[psnpp-gist] pulled');
    }
  } catch (e) {
    console.warn('[psnpp-gist] pull failed:', e);
  }

  const debouncedSync = debounce(async () => {
    const syncable = getSyncableFromRegistry(getListsFromStorage(), registry);
    const snapshot = getSnapshot(syncable);
    if (!isDirty(snapshot)) return;

    console.log('[psnpp-gist] pushing...');
    await pushLists(syncable, config.gistId, config.token);

    markSynced(snapshot);
    console.log('[psnpp-gist] synced');
  }, DEBOUNCE_MS);

  interceptListStorage(() => {
    if (suppressSync) return;
    debouncedSync();
  });
}

void init();
