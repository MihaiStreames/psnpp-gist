import { DEBOUNCE_MS } from './constants.ts';
import { interceptListStorage } from './intercept.ts';
import { getListsFromStorage } from './storage.ts';
import { debounce, getSnapshot, isDirty, markSynced } from './sync.ts';

const debouncedSync = debounce(() => {
  const lists = getListsFromStorage();
  const snapshot = getSnapshot(lists);

  console.log(`[psnpp-gist] ${lists.length} lists:`);
  for (const list of lists) {
    console.log(`  "${list.name}": ${list.games.length} games`);
  }

  if (!isDirty(snapshot)) {
    console.log('[psnpp-gist] no changes, skipping');
    return;
  }

  console.log('[psnpp-gist] dirty, would push to Gist');
  markSynced(snapshot);
  console.log('[psnpp-gist] snapshot saved');
}, DEBOUNCE_MS);

interceptListStorage(debouncedSync);
