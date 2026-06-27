import { fetchManifest } from "./api.ts";
import { SETTINGS_KEY } from "./constants.ts";
import { button, el, faIcon, tip } from "./ui/dom.ts";
import { panelCheckboxRow, panelInputRow, panelSection, makeInput } from "./ui/panel.ts";
import { getListsFromStorage, onStorageSet } from "./storage.ts";
import type { IList, IGistEntry, IGistConfig } from "./types.ts";

const PAT_RE = /^(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})$/;
const GIST_ID_RE = /^[a-f0-9]{20,32}$/;

function readStoredConfig(): { token: string; gists: IGistEntry[] } {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (raw === null) return { token: "", gists: [] };

  try {
    const s = JSON.parse(raw) as Record<string, unknown>;
    return {
      token: (s["gistToken"] as string | undefined) ?? "",
      gists: (s["gistEntries"] as IGistEntry[] | undefined) ?? [],
    };
  } catch {
    return { token: "", gists: [] };
  }
}

interface IGistBlock {
  el: HTMLElement;
  read: () => IGistEntry;
}

function buildGistBlock(
  entry: IGistEntry,
  manifest: Record<string, string>,
  allLists: IList[],
  onRemove: () => void,
): IGistBlock {
  const localOnlyLists = allLists.filter(
    l => (l.url === undefined || l.url === "") && !Object.keys(manifest).includes(l.id),
  );
  const configFiles = new Set(entry.files);

  const checkboxes: Array<{ uuid: string; name: string; input: HTMLInputElement }> = [];

  for (const [uuid, name] of Object.entries(manifest)) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = configFiles.has(uuid);
    checkboxes.push({ uuid, name, input });
  }

  for (const list of localOnlyLists) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = configFiles.has(list.id);
    checkboxes.push({ uuid: list.id, name: list.name, input });
  }

  const rows = checkboxes.map(({ name, input }) => panelCheckboxRow(name, input));

  const removeBtn = button("red");
  removeBtn.textContent = "Remove Gist";
  removeBtn.style.marginTop = "10px";
  removeBtn.addEventListener("click", e => {
    e.preventDefault();
    onRemove();
  });

  const container = el("div");
  container.className = "box";
  container.style.cssText = "padding: 10px; margin-top: 10px;";

  const header = el("div");
  header.style.cssText = "font-weight: bold; margin-bottom: 5px; font-size: 12px; color: #888;";
  header.textContent = `Gist ${entry.id}`;

  container.append(header, ...rows, removeBtn);

  return {
    el: container,
    read: () => ({
      id: entry.id,
      files: checkboxes.filter(({ input }) => input.checked).map(({ uuid }) => uuid),
      readOnly: entry.readOnly,
    }),
  };
}

function removeGistBlock(blocks: IGistBlock[], block: IGistBlock): void {
  const idx = blocks.indexOf(block);
  if (idx !== -1) {
    block.el.remove();
    blocks.splice(idx, 1);
  }
}

function addGist(
  id: string,
  manifest: Record<string, string>,
  allLists: IList[],
  gistBlocks: IGistBlock[],
  gistContainer: HTMLElement,
): void {
  const entry: IGistEntry = {
    id,
    files: Object.keys(manifest),
  };
  const block = buildGistBlock(entry, manifest, allLists, () => {
    removeGistBlock(gistBlocks, block);
  });
  gistBlocks.push(block);
  gistContainer.appendChild(block.el);
}

function buildSection(stored: { token: string; gists: IGistEntry[] }): {
  el: HTMLElement;
  read: () => IGistConfig;
} {
  const tokenInput = makeInput(stored.token, v => PAT_RE.test(v));
  const addIdInput = makeInput("", v => GIST_ID_RE.test(v));

  const gistContainer = el("div");
  const gistBlocks: IGistBlock[] = [];
  const allLists = getListsFromStorage();

  // render existing gist entries (with empty manifests until fetched)
  for (const entry of stored.gists) {
    const block = buildGistBlock(entry, {}, allLists, () => {
      removeGistBlock(gistBlocks, block);
    });
    gistBlocks.push(block);
    gistContainer.appendChild(block.el);
  }

  const addRow = el("div", "row middle-xs");
  addRow.style.cssText = "margin-top: 10px; margin-bottom: 10px;";

  const addLabel = el("span", "small-title");
  addLabel.textContent = "Add Gist";
  const addLabelCol = el("div", "col-xs-2");
  addLabelCol.style.textAlign = "right";
  addLabelCol.appendChild(addLabel);

  const addInputLabel = el("label", "input");
  addInputLabel.append(addIdInput, el("i"));
  tip(addIdInput, "Paste a Gist ID to add it. Find it in the URL: gist.github.com/{user}/{id}");

  const addInputCol = el("div", "col-xs-9");
  addInputCol.appendChild(addInputLabel);

  const fetchLink = button("blue");
  fetchLink.appendChild(faIcon("fa-download"));

  const fetchCol = el("div", "col-xs-1");
  fetchCol.appendChild(fetchLink);

  addRow.append(addLabelCol, addInputCol, fetchCol);

  const statusMsg = el("div");
  statusMsg.style.cssText = "margin-top: 5px; font-size: 12px; padding-left: 16.667%;";

  fetchLink.addEventListener("click", e => {
    e.preventDefault();
    const id = addIdInput.value.trim();
    if (!GIST_ID_RE.test(id)) return;

    const token = tokenInput.value.trim();
    if (!PAT_RE.test(token)) {
      statusMsg.textContent = "Enter a valid PAT first.";
      statusMsg.style.color = "#ffb6c1";
      return;
    }

    // check for duplicate
    if (gistBlocks.some(b => b.read().id === id)) {
      statusMsg.textContent = "This Gist is already added.";
      statusMsg.style.color = "#ffb6c1";
      return;
    }

    statusMsg.textContent = "Fetching...";
    statusMsg.style.color = "#888";

    void fetchManifest(id, token).then(
      ({ manifest }) => {
        addGist(id, manifest ?? {}, allLists, gistBlocks, gistContainer);
        addIdInput.value = "";
        statusMsg.textContent = "";
      },
      (e: unknown) => {
        statusMsg.textContent = String(e instanceof Error ? e.message : e);
        statusMsg.style.color = "#ffb6c1";
      },
    );
  });

  const section = panelSection(
    "Gist Sync",
    panelInputRow("GitHub PAT", tokenInput, 'Personal Access Token with "gist" scope.'),
    gistContainer,
    addRow,
    statusMsg,
  );
  section.id = "psnpp-gist-section";

  return {
    el: section,
    read: () => ({
      token: tokenInput.value.trim(),
      gists: gistBlocks.map(b => b.read()),
    }),
  };
}

export function setupSettings(): void {
  let reader: (() => IGistConfig) | null = null;

  // merge our fields into psnpp-settings whenever PSNP+ saves
  onStorageSet(SETTINGS_KEY, value => {
    if (reader === null) return value;

    const parsed = JSON.parse(value) as Record<string, unknown>;
    const config = reader();

    parsed["gistToken"] = config.token;
    parsed["gistEntries"] = config.gists;

    return JSON.stringify(parsed);
  });

  const observer = new MutationObserver(() => {
    const inner = document.querySelector("#inner");

    if (inner !== null && inner.querySelector("#psnpp-gist-section") === null) {
      const state = buildSection(readStoredConfig());
      reader = state.read;

      const trophyH3 = Array.from(inner.querySelectorAll("h3")).find(
        h => h.textContent === "Trophy List",
      );
      const anchor = trophyH3?.closest(".row") ?? inner.querySelector(".bottom.cf") ?? null;
      anchor?.before(state.el);
    }

    if (inner === null) reader = null;
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
