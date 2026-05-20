import type { IList } from './types.ts';

const GIST_API = 'https://api.github.com/gists';
const FILENAME = 'psnpp-lists.json';

export interface PullResult {
  lists: IList[] | null; // null = file absent (first use)
  scopeWarning: string | null;
}

function parseResponseHeader(headers: string, name: string): string {
  const lower = name.toLowerCase();

  for (const line of headers.split('\r\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;

    if (line.slice(0, colon).toLowerCase().trim() === lower) {
      return line.slice(colon + 1).trim();
    }
  }

  return '';
}

export function pullLists(gistId: string, token: string): Promise<PullResult> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: `${GIST_API}/${gistId}`,
      headers: { Authorization: `Bearer ${token}` },

      onload: (res: Tampermonkey.Response<never>) => {
        if (res.status !== 200) {
          reject(
            new Error(`Couldn't reach your Gist (${res.status}). Check your Gist ID and token.`),
          );
          return;
        }

        // classic PATs expose scopes; fine-grained PATs return an empty header
        const scopeHeader = parseResponseHeader(res.responseHeaders, 'x-oauth-scopes');
        const scopes = scopeHeader
          .split(',')
          .map(s => s.trim())
          .filter(s => s !== '');
        const unnecessary = scopes.filter(s => s !== 'gist');
        const scopeWarning =
          unnecessary.length > 0
            ? `Token has extra scopes: ${unnecessary.join(', ')}. Consider a gist-only PAT.`
            : null;

        const gist = JSON.parse(res.responseText) as {
          files: Record<string, { content: string }>;
        };
        const file = gist.files[FILENAME];
        if (file === undefined) {
          resolve({ lists: null, scopeWarning });
          return;
        }

        const lists = JSON.parse(file.content) as unknown;
        if (!Array.isArray(lists)) {
          reject(
            new Error('Gist data looks corrupted. Try pushing again or check your Gist manually.'),
          );
          return;
        }

        resolve({ lists: lists as IList[], scopeWarning });
      },

      onerror: () => {
        reject(new Error('Network error while reaching GitHub. Check your connection.'));
      },
    });
  });
}

export function pushLists(lists: IList[], gistId: string, token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      // @ts-expect-error: @types/tampermonkey omits PATCH
      method: 'PATCH',
      url: `${GIST_API}/${gistId}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        files: { [FILENAME]: { content: JSON.stringify(lists, null, 2) } },
      }),

      onload: (res: Tampermonkey.Response<never>) => {
        if (res.status === 200) resolve();
        else {
          reject(
            new Error(`Couldn't save to your Gist (${res.status}). Check your token permissions.`),
          );
        }
      },

      onerror: () => {
        reject(new Error('Network error while saving to GitHub. Check your connection.'));
      },
    });
  });
}
