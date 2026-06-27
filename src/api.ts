import { MANIFEST_FILENAME } from "./constants.ts";
import type { IList } from "./types.ts";

const GIST_API = "https://api.github.com/gists";

type GistError =
  | { kind: "unauthorized" }
  | { kind: "forbidden" }
  | { kind: "not-found" }
  | { kind: "http-error"; status: number };

export class GistApiError extends Error {
  constructor(public readonly error: GistError) {
    super(GistApiError.message(error));
  }

  static message(e: GistError): string {
    switch (e.kind) {
      case "unauthorized":
        return "Token is invalid or expired. Check your GitHub PAT.";
      case "forbidden":
        return "No write access to this Gist. Check your token permissions.";
      case "not-found":
        return "Gist not found. Check your Gist ID.";
      case "http-error":
        return `GitHub API error (${e.status}). Try again later.`;
    }
  }
}

interface IGistResponse {
  files: Record<string, { content: string } | undefined>;
  updated_at: string;
}

interface IManifestResult {
  manifest: Record<string, string> | null;
  scopeWarning: string | null;
  gistUpdatedAt: string;
}

function parseResponseHeader(headers: string, name: string): string {
  const lower = name.toLowerCase();

  for (const line of headers.split("\r\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    if (line.slice(0, colon).toLowerCase().trim() === lower) return line.slice(colon + 1).trim();
  }

  return "";
}

function checkScopes(headers: string): string | null {
  // classic PATs expose scopes; fine-grained PATs return an empty header
  const scopeHeader = parseResponseHeader(headers, "x-oauth-scopes");
  const scopes = scopeHeader
    .split(",")
    .map(s => s.trim())
    .filter(s => s !== "");
  const unnecessary = scopes.filter(s => s !== "gist");

  return unnecessary.length > 0
    ? `Token has extra scopes: ${unnecessary.join(", ")}. Consider a gist-only PAT.`
    : null;
}

function toGistError(status: number): GistError {
  if (status === 401) return { kind: "unauthorized" };
  if (status === 403) return { kind: "forbidden" };
  if (status === 404) return { kind: "not-found" };
  return { kind: "http-error", status };
}

function getGist(gistId: string, token: string): Promise<{ gist: IGistResponse; headers: string }> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: `${GIST_API}/${gistId}`,
      headers: { Authorization: `Bearer ${token}` },

      onload: (res: Tampermonkey.Response<never>) => {
        if (res.status !== 200) {
          reject(new GistApiError(toGistError(res.status)));
          return;
        }

        resolve({
          gist: JSON.parse(res.responseText) as IGistResponse,
          headers: res.responseHeaders,
        });
      },

      onerror: () => {
        reject(new Error("Network error while reaching GitHub. Check your connection."));
      },
    });
  });
}

function patchGist(
  gistId: string,
  token: string,
  files: Record<string, { content: string } | null>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      // @ts-expect-error: @types/tampermonkey omits PATCH
      method: "PATCH",
      url: `${GIST_API}/${gistId}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ files }),

      onload: (res: Tampermonkey.Response<never>) => {
        if (res.status === 200) {
          resolve();
        } else {
          reject(new GistApiError(toGistError(res.status)));
        }
      },

      onerror: () => {
        reject(new Error("Network error while saving to GitHub. Check your connection."));
      },
    });
  });
}

export async function fetchManifest(gistId: string, token: string): Promise<IManifestResult> {
  const { gist, headers } = await getGist(gistId, token);
  const scopeWarning = checkScopes(headers);
  const manifestFile = gist.files[MANIFEST_FILENAME];

  return {
    manifest:
      manifestFile !== undefined
        ? (JSON.parse(manifestFile.content) as Record<string, string>)
        : null,
    scopeWarning,
    gistUpdatedAt: gist.updated_at,
  };
}

export async function pullFile(gistId: string, uuid: string, token: string): Promise<IList | null> {
  const { gist } = await getGist(gistId, token);
  const file = gist.files[`${uuid}.json`];
  if (file === undefined) return null;
  return JSON.parse(file.content) as IList;
}

export async function pushFiles(
  gistId: string,
  lists: Record<string, IList>,
  manifest: Record<string, string>,
  token: string,
): Promise<void> {
  const files: Record<string, { content: string }> = {
    [MANIFEST_FILENAME]: { content: JSON.stringify(manifest, null, 2) },
  };

  for (const [uuid, list] of Object.entries(lists)) {
    files[`${uuid}.json`] = { content: JSON.stringify(list, null, 2) };
  }

  await patchGist(gistId, token, files);
}

export async function deleteFile(
  gistId: string,
  uuid: string,
  manifest: Record<string, string>,
  token: string,
): Promise<void> {
  await patchGist(gistId, token, {
    [`${uuid}.json`]: null,
    [MANIFEST_FILENAME]: { content: JSON.stringify(manifest, null, 2) },
  });
}
