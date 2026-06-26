import type { IList } from "./types.ts";
import { LISTS_KEY, SETTINGS_KEY, SNAPSHOT_KEY_PREFIX } from "./constants.ts";

export interface GistEntry {
  id: string;
  files: string[];
  readOnly?: boolean;
}

export interface GistConfig {
  token: string;
  gists: GistEntry[];
}

export type GistConfigState =
  | { status: "none" }
  | { status: "partial"; message: string }
  | { status: "ok"; config: GistConfig };

// "gistId:uuid" -> localListId | null (null = not yet created locally)
export type GistRegistry = Record<string, string | null>;

export function loadGistConfigState(): GistConfigState {
  const raw = localStorage.getItem(SETTINGS_KEY);
  let s: { gistToken?: string; gistEntries?: GistEntry[] } = {};

  if (raw !== null) {
    try {
      s = JSON.parse(raw) as typeof s;
    } catch {
      console.warn("[psnpp-gist] corrupted settings data in localStorage");
    }
  }

  const token = s.gistToken ?? "";

  if (s.gistEntries === undefined) {
    if (token === "") return { status: "none" };

    return {
      status: "partial",
      message: "Add a Gist in the Gist Sync settings to get started.",
    };
  }

  if (token === "") {
    return {
      status: "partial",
      message: "Add your GitHub PAT in the Gist Sync settings to get started.",
    };
  }

  return { status: "ok", config: { token, gists: s.gistEntries } };
}

export function getListsFromStorage(): IList[] {
  const raw = localStorage.getItem(LISTS_KEY);
  if (raw === null) return [];

  try {
    return JSON.parse(raw) as IList[];
  } catch {
    console.warn("[psnpp-gist] corrupted lists data in localStorage, resetting");
    return [];
  }
}

export function createList(list: IList): void {
  const all = getListsFromStorage();
  all.push(list);
  Storage.prototype.setItem.call(localStorage, LISTS_KEY, JSON.stringify(all));
}

export function snapshotKey(gistId: string, uuid: string): string {
  return `${SNAPSHOT_KEY_PREFIX}${gistId}:${uuid}`;
}

export function buildRegistry(config: GistConfig): GistRegistry {
  const all = getListsFromStorage();
  const registry: GistRegistry = {};

  for (const entry of config.gists) {
    for (const uuid of entry.files) {
      const local = all.find(l => l.id === uuid);
      registry[`${entry.id}:${uuid}`] = local !== undefined ? local.id : null;
    }
  }

  return registry;
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
          console.warn("[psnpp-gist] transform error:", e);
        }
      }
    }

    original.call(this, key, value);

    for (const [k, fn] of effects) {
      if (k === key) {
        try {
          fn();
        } catch (e) {
          console.warn("[psnpp-gist] effect error:", e);
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
          console.warn("[psnpp-gist] remove effect error:", e);
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
