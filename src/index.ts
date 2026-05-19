import { pullLists, pushLists } from './api.ts';
import { DEBOUNCE_MS, LISTS_KEY, REGISTRY_KEY, SETTINGS_KEY, SNAPSHOT_KEY } from './constants.ts';
import { setupSettings, loadSyncedListNames } from './settings.ts';
import {
  applyPulledLists,
  ensureRegistered,
  getListsFromStorage,
  loadGistConfigState,
  onStorageEffect,
  onStorageRemove,
  updateRegistry,
} from './storage.ts';
import type { GistConfig } from './storage.ts';
import { debounce, getSnapshot, getSyncableFromRegistry, isDirty, markSynced } from './sync.ts';
import { injectStatusIndicator, markGistLists, waitForElement } from './ui.ts';
import type { SyncStatus } from './ui.ts';

const registry = ensureRegistered(loadSyncedListNames());

const configState = loadGistConfigState();
const config: GistConfig | null = configState.status === 'ok' ? configState.config : null;

const trackedNames = Object.keys(registry);
console.log(
  `[psnpp-gist] init | config: ${configState.status} | tracking: ${trackedNames.length > 0 ? trackedNames.join(', ') : 'none'}`,
);

// no-op until injectStatusIndicator() runs on the game lists page
let updateStatus: (status: SyncStatus, detail?: string) => void = () => {};

let suppressSync = false;

const debouncedSync = debounce(async () => {
  if (config === null) return;

  const syncable = getSyncableFromRegistry(getListsFromStorage(), registry);
  if (syncable.length === 0) return;

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

  if (configState.status === 'none') return;

  if (configState.status === 'partial') {
    updateStatus = injectStatusIndicator();
    updateStatus('error', configState.message);
    return;
  }

  if (Object.keys(registry).length === 0) return;

  updateStatus = injectStatusIndicator();
  markGistLists(registry);

  try {
    updateStatus('syncing');

    const { lists: pulled, scopeWarning } = await pullLists(
      configState.config.gistId,
      configState.config.token,
    );

    if (scopeWarning !== null) {
      console.warn('[psnpp-gist] scope warning:', scopeWarning);
    }

    if (pulled === null) {
      // first use: psnpp-lists.json doesn't exist in the Gist yet
      console.log('[psnpp-gist] initial push...');
      const syncable = getSyncableFromRegistry(getListsFromStorage(), registry);
      await pushLists(syncable, configState.config.gistId, configState.config.token);
      markSynced(getSnapshot(syncable));
      console.log('[psnpp-gist] initial push done');
    } else {
      const pulledSnapshot = getSnapshot(pulled);
      if (isDirty(pulledSnapshot)) {
        console.log('[psnpp-gist] pulling from Gist...');

        suppressSync = true;
        applyPulledLists(pulled, registry);
        suppressSync = false;

        markSynced(pulledSnapshot);
        console.log('[psnpp-gist] pulled');
      }
    }

    updateStatus('synced', scopeWarning ?? undefined);
  } catch (e) {
    console.warn('[psnpp-gist] pull failed:', e);
    updateStatus('error', String(e));
  }
}

void initGameListsPage();
