import { pullLists, pushLists } from './api.ts';
import { DEBOUNCE_MS, LISTS_KEY, REGISTRY_KEY, SETTINGS_KEY, SNAPSHOT_KEY } from './constants.ts';
import { setupSettings, loadSyncedListNames } from './settings.ts';
import {
  applyPulledLists,
  ensureRegistered,
  getListsFromStorage,
  loadGistConfig,
  onStorageEffect,
  onStorageRemove,
  updateRegistry,
} from './storage.ts';
import type { GistConfig } from './storage.ts';
import { debounce, getSnapshot, getSyncableFromRegistry, isDirty, markSynced } from './sync.ts';
import { injectStatusIndicator, markGistLists, waitForElement } from './ui.ts';
import type { SyncStatus } from './ui.ts';

const registry = ensureRegistered(loadSyncedListNames());

const config: GistConfig | null = loadGistConfig();

const trackedNames = Object.keys(registry);
console.log(
  `[psnpp-gist] init | config: ${config !== null ? 'ok' : 'not set'} | tracking: ${trackedNames.length > 0 ? trackedNames.join(', ') : 'none'}`,
);

// no-op until injectStatusIndicator() runs on the game lists page
let updateStatus: (status: SyncStatus, detail?: string) => void = () => {};

let suppressSync = false;

const debouncedSync = debounce(async () => {
  if (config === null) return;

  const syncable = getSyncableFromRegistry(getListsFromStorage(), registry);
  const snapshot = getSnapshot(syncable);
  if (!isDirty(snapshot)) return;

  console.log('[psnpp-gist] pushing...');
  updateStatus('syncing');

  try {
    await pushLists(syncable, config.gistId, config.token);
    markSynced(snapshot);
    updateStatus('synced');
    console.log('[psnpp-gist] synced');
  } catch (e) {
    console.warn('[psnpp-gist] push failed:', e);
    updateStatus('error', String(e));
  }
}, DEBOUNCE_MS);

onStorageEffect(LISTS_KEY, () => {
  updateRegistry(loadSyncedListNames(), registry);
  if (!suppressSync) debouncedSync();
});

onStorageEffect(SETTINGS_KEY, () => {
  updateRegistry(loadSyncedListNames(), registry);
});

// clear data uses removeItem; reset our state so next load starts fresh
onStorageRemove(LISTS_KEY, () => {
  for (const key of Object.keys(registry)) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete registry[key];
  }

  localStorage.removeItem(REGISTRY_KEY);
  localStorage.removeItem(SNAPSHOT_KEY);
});

setupSettings();

async function initGameListsPage(): Promise<void> {
  try {
    await waitForElement('label.select select');
  } catch {
    return; // not on game lists page
  }

  updateStatus = injectStatusIndicator();
  markGistLists(registry);

  if (config === null) {
    updateStatus(
      'error',
      'Gist not configured! Please set your GitHub PAT and Gist ID in PSNP+ settings.',
    );
    return;
  }

  try {
    updateStatus('syncing');

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

    updateStatus('synced');
  } catch (e) {
    console.warn('[psnpp-gist] pull failed:', e);
    updateStatus('error', String(e));
  }
}

void initGameListsPage();
