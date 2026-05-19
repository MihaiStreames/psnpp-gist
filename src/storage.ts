import type { IList } from './types.ts';
import { LISTS_KEY, SETTINGS_KEY, REGISTRY_KEY } from './constants.ts';

export type GistRegistry = Record<string, string>; // name -> localId

export interface GistConfig {
  token: string;
  gistId: string;
}

export type GistConfigState =
  | { status: 'none' }
  | { status: 'partial'; message: string }
  | { status: 'ok'; config: GistConfig };

export function getListsFromStorage(): IList[] {
  const raw = localStorage.getItem(LISTS_KEY);
  if (raw === null) return [];

  return JSON.parse(raw) as IList[];
}

export function loadRegistry(): GistRegistry {
  const raw = localStorage.getItem(REGISTRY_KEY);
  if (raw === null) return {};

  return JSON.parse(raw) as GistRegistry;
}

function saveRegistry(registry: GistRegistry): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export function updateRegistry(names: string[], registry: GistRegistry): void {
  const all = getListsFromStorage();
  const nameSet = new Set(names);
  const existingIds = new Set(all.map(l => l.id));
  let changed = false;

  for (const name of Object.keys(registry)) {
    const id = registry[name];
    if (!nameSet.has(name) || id === undefined || !existingIds.has(id)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete registry[name];
      changed = true;
    }
  }

  for (const name of names) {
    if (registry[name] === undefined) {
      const match = all.find(l => l.name === name && (l.url === undefined || l.url === ''));
      if (match !== undefined) {
        registry[name] = match.id;
        changed = true;
      }
    }
  }

  if (changed) saveRegistry(registry);
}

export function ensureRegistered(names: string[]): GistRegistry {
  const registry = loadRegistry();
  updateRegistry(names, registry);
  return registry;
}

export function applyPulledLists(pulled: IList[], registry: GistRegistry): void {
  const all = getListsFromStorage();
  let changed = false;

  for (const pulledList of pulled) {
    const localId = registry[pulledList.name];
    if (localId === undefined) continue;

    const idx = all.findIndex(l => l.id === localId);
    if (idx !== -1) {
      all[idx] = { ...pulledList, id: localId }; // preserve local UUID
      changed = true;
    }
  }

  if (changed) localStorage.setItem(LISTS_KEY, JSON.stringify(all));
}

export function loadGistConfigState(): GistConfigState {
  const raw = localStorage.getItem(SETTINGS_KEY);
  const s = raw !== null ? (JSON.parse(raw) as { gistToken?: string; gistId?: string }) : {};
  const token = s.gistToken ?? '';
  const gistId = s.gistId ?? '';

  if (token === '' && gistId === '') {
    return { status: 'none' };
  }

  if (token === '') {
    return { status: 'partial', message: 'GitHub PAT is missing from Gist Sync settings.' };
  }

  if (gistId === '') {
    return { status: 'partial', message: 'Gist ID is missing from Gist Sync settings.' };
  }

  return { status: 'ok', config: { token, gistId } };
}

const transforms: Array<[string, (v: string) => string]> = [];
const effects: Array<[string, () => void]> = [];
const removeEffects: Array<[string, () => void]> = [];
let setPatched = false;
let removePatched = false;

function patchSetItem(): void {
  if (setPatched) return;
  setPatched = true;

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const original = Storage.prototype.setItem;

  Storage.prototype.setItem = function (key: string, value: string): void {
    for (const [k, fn] of transforms) {
      if (k === key) {
        try {
          value = fn(value);
        } catch (e) {
          console.warn('[psnpp-gist] transform error:', e);
        }
      }
    }

    original.call(this, key, value);

    for (const [k, fn] of effects) {
      if (k === key) {
        try {
          fn();
        } catch (e) {
          console.warn('[psnpp-gist] effect error:', e);
        }
      }
    }
  };
}

function patchRemoveItem(): void {
  if (removePatched) return;
  removePatched = true;

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const original = Storage.prototype.removeItem;

  Storage.prototype.removeItem = function (key: string): void {
    original.call(this, key);

    for (const [k, fn] of removeEffects) {
      if (k === key) {
        try {
          fn();
        } catch (e) {
          console.warn('[psnpp-gist] remove effect error:', e);
        }
      }
    }
  };
}

export function onStorageSet(key: string, transform: (value: string) => string): void {
  patchSetItem();
  transforms.push([key, transform]);
}

export function onStorageEffect(key: string, fn: () => void): void {
  patchSetItem();
  effects.push([key, fn]);
}

export function onStorageRemove(key: string, fn: () => void): void {
  patchRemoveItem();
  removeEffects.push([key, fn]);
}
