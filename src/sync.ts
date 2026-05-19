import type { IList } from './types.ts';
import { SNAPSHOT_KEY } from './constants.ts';

export function getSnapshot(lists: IList[]): string {
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

export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  ms: number,
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, ms);
  };
}
