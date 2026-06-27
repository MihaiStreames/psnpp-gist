import { button, el, jq, faIcon, TIP_DEFAULTS } from "./ui/dom.ts";
import type { TSyncStatus, TGistRegistry } from "./types.ts";

function grabTrackedIds(registry: TGistRegistry): Set<string> {
  return new Set(Object.values(registry).filter((id): id is string => id !== null));
}

function getSelect(): HTMLSelectElement | null {
  return document.querySelector<HTMLSelectElement>("label.select select");
}

function updateVisibility(col: HTMLElement, offsetCol: Element | null, tracked: boolean): void {
  col.style.display = tracked ? "" : "none";
  if (offsetCol !== null) {
    offsetCol.classList.toggle("col-xs-offset-4", tracked);
    offsetCol.classList.toggle("col-xs-offset-5", !tracked);
  }
}

export function markGistLists(registry: TGistRegistry): void {
  const trackedIds = grabTrackedIds(registry);
  const select = getSelect();
  if (select === null) return;

  for (const option of select.options) {
    if (trackedIds.has(option.value) && !option.text.endsWith(" ☁")) {
      option.text = `${option.text} ☁`;
    }
  }
}

export function injectStatusIndicator(
  registry: TGistRegistry,
): (status: TSyncStatus, detail?: string) => void {
  const trackedIds = grabTrackedIds(registry);
  const select = getSelect();
  if (select === null) return () => {};

  const col = el("div", "col-xs-1");
  col.style.cssText = "padding-top:6px;";

  const btn = button("blue");
  const icon = faIcon("fa-cloud");
  icon.id = "psnpp-gist-status";
  icon.style.cssText = "cursor:default;";

  btn.appendChild(icon);
  col.appendChild(btn);

  const deleteCol = document.querySelector("a.button.red")?.closest(".col-xs-1") ?? null;
  let offsetCol: Element | null = null;
  if (deleteCol !== null) {
    deleteCol.after(col);

    offsetCol = deleteCol.closest(".row")?.querySelector(".col-xs-offset-5") ?? null;
    updateVisibility(col, offsetCol, trackedIds.has(select.value));

    select.addEventListener("change", () => {
      updateVisibility(col, offsetCol, trackedIds.has(select.value));
    });
  }

  return (status: TSyncStatus, detail?: string) => {
    const content = detail ?? "";
    jq(btn).off("mouseenter mouseleave");
    if (content !== "") jq(btn).tipTip({ ...TIP_DEFAULTS, defaultPosition: "right", content });

    btn.className = status === "error" ? "button red" : "button blue";
    icon.className = `fa ${status === "syncing" ? "fa-refresh fa-spin" : status === "error" ? "fa-exclamation-circle" : "fa-cloud"}`;
  };
}
