import type { IList } from './types.ts';
import { LISTS_KEY } from './constants.ts';

export function getListsFromStorage(): IList[] {
  const raw = localStorage.getItem(LISTS_KEY);
  if (raw === null) {
    return [];
  }

  return JSON.parse(raw) as IList[];
}
