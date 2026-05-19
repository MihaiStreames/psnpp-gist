import type { IList } from './types.ts';
import { GM_GIST_ID_KEY, GM_TOKEN_KEY, LISTS_KEY, REGISTRY_KEY } from './constants.ts';

export type GistRegistry = Record<string, string>; // name -> localId

export interface GistConfig {
  token: string;
  gistId: string;
}

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

export function ensureRegistered(names: string[]): GistRegistry {
  const all = getListsFromStorage();
  const registry = loadRegistry();
  let changed = false;

  // for each name, find matching local list and register its UUID
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

export async function loadGistConfig(): Promise<GistConfig | null> {
  const token = await GM.getValue(GM_TOKEN_KEY, '');
  const gistId = await GM.getValue(GM_GIST_ID_KEY, '');
  if (token === '' || gistId === '') return null;

  return { token, gistId };
}

export async function saveGistConfig(config: GistConfig): Promise<void> {
  await GM.setValue(GM_TOKEN_KEY, config.token);
  await GM.setValue(GM_GIST_ID_KEY, config.gistId);
}
