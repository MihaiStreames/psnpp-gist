type ListsChangeCallback = (rawJson: string) => void;

export function interceptListStorage(onChange: ListsChangeCallback): void {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const original = Storage.prototype.setItem;

  Storage.prototype.setItem = function (key: string, value: string): void {
    original.call(this, key, value);

    if (key === 'psnpp-lists') {
      onChange(value);
    }
  };
}
