import { button, el, jq, faIcon, TIP_DEFAULTS } from "./dom.ts";
import type { GistRegistry } from "./storage.ts";

export type SyncStatus = "syncing" | "synced" | "error";

export function markGistLists(registry: GistRegistry): void {
  const trackedIds = new Set(Object.values(registry).filter((id): id is string => id !== null));
  const select = document.querySelector<HTMLSelectElement>("label.select select");
  if (select === null) return;

  for (const option of select.options) {
    if (trackedIds.has(option.value) && !option.text.endsWith(" ☁")) {
      option.text = `${option.text} ☁`;
    }
  }
}

export function injectStatusIndicator(): (status: SyncStatus, detail?: string) => void {
  const col = el("div", "col-xs-1");
  col.style.cssText = "padding-top:6px;";

  const btn = button("blue");
  const icon = faIcon("fa-cloud");
  icon.id = "psnpp-gist-status";
  icon.style.cssText = "cursor:default;";

  btn.appendChild(icon);
  col.appendChild(btn);

  const deleteCol = document.querySelector("a.button.red")?.closest(".col-xs-1") ?? null;
  if (deleteCol !== null) {
    deleteCol.after(col);

    const offsetCol = deleteCol.closest(".row")?.querySelector(".col-xs-offset-5") ?? null;
    if (offsetCol !== null) {
      offsetCol.classList.remove("col-xs-offset-5");
      offsetCol.classList.add("col-xs-offset-4");
    }
  }

  return (status: SyncStatus, detail?: string) => {
    const content = detail ?? "";
    jq(btn).off("mouseenter mouseleave");
    if (content !== "") jq(btn).tipTip({ ...TIP_DEFAULTS, defaultPosition: "right", content });

    btn.className = status === "error" ? "button red" : "button blue";
    icon.className = `fa ${status === "syncing" ? "fa-refresh fa-spin" : status === "error" ? "fa-exclamation-circle" : "fa-cloud"}`;
  };
}
