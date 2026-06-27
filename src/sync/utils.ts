import type { IList } from "../types.ts";

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

export function getListSnapshot(list: IList): string {
  // strip scrapetime: cache field, not user data, should not trigger sync
  return JSON.stringify({
    ...list,
    games: list.games.map(({ scrapetime: _s, ...game }) => game),
  });
}

export function isKeyDirty(key: string, snapshot: string): boolean {
  return snapshot !== localStorage.getItem(key);
}

export function markKeySynced(key: string, snapshot: string): void {
  localStorage.setItem(key, snapshot);
}
