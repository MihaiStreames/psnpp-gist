import { SETTINGS_KEY, SYNCED_LIST_NAMES } from "./constants.ts";
import { onStorageSet } from "./storage.ts";
import { panelInputRow, panelSection } from "./panel.ts";

const PAT_RE = /^(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})$/;

interface GistSettings {
  gistToken: string;
  gistId: string;
  gistSyncedLists: string[];
}

function readGistSettings(): GistSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  const s = raw !== null ? (JSON.parse(raw) as Record<string, unknown>) : {};

  return {
    gistToken: (s["gistToken"] as string | undefined) ?? "",
    gistId: (s["gistId"] as string | undefined) ?? "",
    gistSyncedLists: (s["gistSyncedLists"] as string[] | undefined) ?? SYNCED_LIST_NAMES,
  };
}

function makeInput(value: string, validate?: (v: string) => boolean): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;

  if (validate !== undefined) {
    input.addEventListener("input", () => {
      const v = input.value.trim();
      input.style.borderColor = v === "" ? "" : validate(v) ? "#e3e3e6" : "#ffb6c1";
    });
  }

  return input;
}

function buildSection(): { el: HTMLElement; read: () => GistSettings } {
  const s = readGistSettings();
  const tokenInput = makeInput(s.gistToken, v => PAT_RE.test(v));
  const idInput = makeInput(s.gistId);
  const listsInput = makeInput(s.gistSyncedLists.join(", "));

  const section = panelSection(
    "Gist Sync",
    panelInputRow("GitHub PAT", tokenInput, 'Personal Access Token with "gist" scope.'),
    panelInputRow("Gist ID", idInput, "The ID from your Gist URL: gist.github.com/{user}/{id}"),
    panelInputRow("Synced lists", listsInput, "Comma-separated list names to sync with Gist."),
  );
  section.id = "psnpp-gist-section";

  return {
    el: section,
    read: () => ({
      gistToken: tokenInput.value.trim(),
      gistId: idInput.value.trim(),
      gistSyncedLists: listsInput.value
        .split(",")
        .map(n => n.trim())
        .filter(n => n !== ""),
    }),
  };
}

export function loadSyncedListNames(): string[] {
  return readGistSettings().gistSyncedLists;
}

export function setupSettings(): void {
  let reader: (() => GistSettings) | null = null;

  // merge our fields into psnpp-settings whenever PSNP+ saves
  onStorageSet(SETTINGS_KEY, value => {
    if (reader === null) return value;

    const parsed = JSON.parse(value) as Record<string, unknown>;
    const gist = reader();

    parsed["gistToken"] = gist.gistToken;
    parsed["gistId"] = gist.gistId;
    parsed["gistSyncedLists"] = gist.gistSyncedLists;

    return JSON.stringify(parsed);
  });

  const observer = new MutationObserver(() => {
    const inner = document.querySelector("#inner");

    if (inner !== null && inner.querySelector("#psnpp-gist-section") === null) {
      const { el, read } = buildSection();
      reader = read;

      const trophyH3 = Array.from(inner.querySelectorAll("h3")).find(
        h => h.textContent === "Trophy List",
      );
      const anchor = trophyH3?.closest(".row") ?? inner.querySelector(".bottom.cf") ?? null;
      anchor?.before(el);
    }

    if (inner === null) reader = null;
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
