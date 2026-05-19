import { LISTS_KEY } from './constants.ts';

export function interceptListStorage(onChange: () => void): void {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key: string, value: string): void {
    original.call(this, key, value);
    if (key === LISTS_KEY) onChange();
  };
}
