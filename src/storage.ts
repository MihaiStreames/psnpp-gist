import type { IList } from './types.ts';
import { GM_GIST_ID_KEY, GM_TOKEN_KEY, LISTS_KEY } from './constants.ts';

export interface GistConfig {
  token: string;
  gistId: string;
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

export function getListsFromStorage(): IList[] {
  const raw = localStorage.getItem(LISTS_KEY);
  if (raw === null) {
    return [];
  }

  return JSON.parse(raw) as IList[];
}
