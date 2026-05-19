import type { IList } from './types.ts';
import { SNAPSHOT_KEY } from './constants.ts';
import type { GistRegistry } from './storage.ts';

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

export function getSyncableFromRegistry(all: IList[], registry: GistRegistry): IList[] {
  return Object.values(registry)
    .map(localId => all.find(l => l.id === localId))
    .filter((l): l is IList => l !== undefined);
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
