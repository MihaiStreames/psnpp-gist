import { interceptListStorage } from './intercept.ts';
import { getListsFromStorage } from './storage.ts';

interceptListStorage(() => {
  const lists = getListsFromStorage();
  console.log('[psnpp-gist] parsed lists:', lists);
  console.log('[psnpp-gist] list count:', lists.length);
  console.log('[psnpp-gist] first list games:', lists[0]?.games.length);
});
