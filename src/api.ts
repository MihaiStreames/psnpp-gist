import type { IList } from './types.ts';

const GIST_API = 'https://api.github.com/gists';
const FILENAME = 'psnpp-lists.json';

export function pullLists(gistId: string, token: string): Promise<IList[]> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: `${GIST_API}/${gistId}`,
      headers: { Authorization: `Bearer ${token}` },

      onload: (res: Tampermonkey.Response<never>) => {
        if (res.status !== 200) {
          reject(new Error(`Gist pull failed: ${res.status}`));
          return;
        }

        const gist = JSON.parse(res.responseText) as {
          files: Record<string, { content: string }>;
        };
        const file = gist.files[FILENAME];
        if (file === undefined) {
          reject(new Error(`File "${FILENAME}" not found in Gist`));
          return;
        }

        resolve(JSON.parse(file.content) as IList[]);
      },

      onerror: () => {
        reject(new Error('Gist pull network error'));
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
        else reject(new Error(`Gist push failed: ${res.status}`));
      },

      onerror: () => {
        reject(new Error('Gist push network error'));
      },
    });
  });
}
