import { jq } from './panel.ts';
import type { GistRegistry } from './storage.ts';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export function waitForElement(selector: string, timeout = 5000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing !== null) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el !== null) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForElement: "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
}

function faIcon(classes: string): HTMLElement {
  const i = document.createElement('i');
  i.className = `fa ${classes}`;
  i.setAttribute('aria-hidden', 'true');
  return i;
}

export function markGistLists(registry: GistRegistry): void {
  const registeredIds = new Set(Object.values(registry));
  const select = document.querySelector<HTMLSelectElement>('label.select select');
  if (select === null) return;

  for (const option of select.options) {
    if (registeredIds.has(option.value) && !option.text.endsWith(' ☁')) {
      option.text = `${option.text} ☁`;
    }
  }
}

export function injectStatusIndicator(): (status: SyncStatus, detail?: string) => void {
  const col = document.createElement('div');
  col.className = 'col-xs-1';
  col.style.cssText = 'padding-top:6px;';

  const button = document.createElement('a');
  button.className = 'button blue';

  const icon = faIcon('fa-cloud');
  icon.id = 'psnpp-gist-status';
  icon.style.cssText = 'cursor:default;';

  button.appendChild(icon);
  col.appendChild(button);

  const deleteCol = document.querySelector('a.button.red')?.closest('.col-xs-1') ?? null;
  if (deleteCol !== null) {
    deleteCol.after(col);

    const offsetCol = deleteCol.closest('.row')?.querySelector('.col-xs-offset-5') ?? null;
    if (offsetCol !== null) {
      offsetCol.classList.remove('col-xs-offset-5');
      offsetCol.classList.add('col-xs-offset-4');
    }
  }

  const tipOpts = {
    defaultPosition: 'right',
    maxWidth: '500px',
    edgeOffset: 0,
    delay: 0,
    fadeIn: 50,
    fadeOut: 50,
  };

  return (status: SyncStatus, detail?: string) => {
    const content = detail ?? '';
    jq(button).off('mouseenter mouseleave');
    if (content !== '') jq(button).tipTip({ ...tipOpts, content });

    button.className = status === 'error' ? 'button red' : 'button blue';
    icon.className = `fa ${status === 'syncing' ? 'fa-refresh fa-spin' : status === 'error' ? 'fa-exclamation-circle' : 'fa-cloud'}`;
  };
}
