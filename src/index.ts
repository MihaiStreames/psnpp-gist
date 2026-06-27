import type { SyncState } from "./types.ts";
import { waitForElement } from "./ui/dom.ts";
import { setupSettings } from "./settings.ts";
import { buildRegistry, loadGistConfigState } from "./storage.ts";
import { injectStatusIndicator, markGistLists } from "./lists.ts";
import { setupPush } from "./sync/push.ts";
import { setupPull, pullEntry } from "./sync/pull.ts";

const configState = loadGistConfigState();
const state: SyncState = {
  config: configState.status === "ok" ? configState.config : null,
  registry: configState.status === "ok" ? buildRegistry(configState.config) : {},
  cachedManifest: {},
  lastPulledAt: {},
  suppressSync: false,
  updateStatus: () => {},
};

async function initGameListsPage(state: SyncState): Promise<void> {
  try {
    await waitForElement("label.select select");
  } catch {
    return;
  }

  if (configState.status === "none") return;

  if (configState.status === "partial") {
    state.updateStatus = injectStatusIndicator(state.registry);
    state.updateStatus("error", configState.message);
    return;
  }

  if (state.config === null || state.config.gists.length === 0) return;

  state.updateStatus = injectStatusIndicator(state.registry);
  markGistLists(state.registry);
  state.updateStatus("syncing");

  let lastScopeWarning: string | null = null;

  try {
    for (const entry of state.config.gists) {
      const warning = await pullEntry(state, entry);
      if (warning !== null) {
        lastScopeWarning = warning;
        console.warn("[psnpp-gist] scope warning:", warning);
      }
    }

    state.updateStatus("synced", lastScopeWarning ?? undefined);
  } catch (e) {
    console.warn("[psnpp-gist] pull failed:", e);
    state.updateStatus("error", String(e instanceof Error ? e.message : e));
  }
}

console.log(
  `[psnpp-gist] init | config: ${configState.status} | tracking: ${Object.keys(state.registry).length} files`,
);

setupSettings();
setupPush(state);
setupPull(state);
void initGameListsPage(state);
