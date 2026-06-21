type JQuery = { tipTip(opts: object): JQuery; off(events: string): JQuery };

export const jq = (unsafeWindow as unknown as { $: (el: Element) => JQuery }).$;

export type ButtonColor = "blue" | "red" | "green";
export type GridCol = `col-xs-${number}` | `col-xs-offset-${number}`;
export type TipPosition = "top" | "bottom" | "left" | "right";

export const TIP_DEFAULTS = {
  maxWidth: "500px",
  edgeOffset: 0,
  delay: 0,
  fadeIn: 50,
  fadeOut: 50,
} as const;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classes?: string,
): HTMLElementTagNameMap[K];
export function el(tag: string, classes?: string): HTMLElement;
export function el(tag: string, classes = ""): HTMLElement {
  const e = document.createElement(tag);
  if (classes !== "") {
    e.className = classes;
  }

  return e;
}

export function faIcon(classes: string): HTMLElement {
  const i = el("i");
  i.className = `fa ${classes}`;
  i.setAttribute("aria-hidden", "true");
  return i;
}

export function tip(target: Element, content: string, position: TipPosition = "bottom"): void {
  if (content !== "") {
    jq(target).tipTip({ ...TIP_DEFAULTS, defaultPosition: position, content });
  }
}

export function waitForElement(selector: string, timeout = 5000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing !== null) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found !== null) {
        observer.disconnect();
        resolve(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForElement: "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
}
