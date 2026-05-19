import type { IList } from './types.ts';

const LISTS_KEY = 'psnpp-lists';

export function getListsFromStorage(): IList[] {
  const raw = localStorage.getItem(LISTS_KEY);
  if (raw === null) {
    return [];
  }

  return JSON.parse(raw) as IList[];
}
