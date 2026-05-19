import type { IList } from './types.ts';
import { SNAPSHOT_KEY, SYNCED_LIST_NAMES } from './constants.ts';

export function debounce<T extends unknown[]>(
  fn: (...args: T) => Promise<void> | void,
  ms: number,
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void fn(...args);
    }, ms);
  };
}

export function getSyncableLists(lists: IList[]): IList[] {
  return lists.filter(
    l => (l.url === undefined || l.url === '') && SYNCED_LIST_NAMES.includes(l.name),
  );
}

export function getSnapshot(lists: IList[]): string {
  // strip scrapetime: cache field, not user data, should not trigger sync
  return JSON.stringify(
    lists.map(list => ({
      ...list,
      games: list.games.map(({ scrapetime: _s, ...game }) => game),
    })),
  );
}

export function isDirty(snapshot: string): boolean {
  return snapshot !== localStorage.getItem(SNAPSHOT_KEY);
}

export function markSynced(snapshot: string): void {
  localStorage.setItem(SNAPSHOT_KEY, snapshot);
}
