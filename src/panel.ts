import { el, tip } from "./dom.ts";

export function panelSection(title: string, ...children: HTMLElement[]): HTMLElement {
  const h3 = el("h3");
  h3.textContent = title;

  const grow = el("div", "grow");
  grow.appendChild(h3);

  const titleDiv = el("div", "title center flex v-align");
  titleDiv.appendChild(grow);

  const box = el("div", "box no-top-border form");
  box.style.padding = "10px";
  box.append(...children);

  const col = el("div", "col-xs-12");
  col.append(titleDiv, box);

  const row = el("div", "row");
  row.appendChild(col);
  return row;
}

export function panelInputRow(label: string, input: HTMLInputElement, tooltip = ""): HTMLElement {
  const span = el("span", "small-title");
  span.textContent = label;

  const labelCol = el("div", "col-xs-2");
  labelCol.style.textAlign = "right";
  labelCol.appendChild(span);

  const labelEl = el("label", "input");
  labelEl.append(input, el("i"));

  const inputCol = el("div", "col-xs-10");
  inputCol.appendChild(labelEl);

  const row = el("div", "row middle-xs");
  row.style.cssText = "margin-top: 10px; margin-bottom: 10px;";
  row.append(labelCol, inputCol);

  if (tooltip !== "") tip(input, tooltip);
  return row;
}

export function panelCheckboxRow(
  label: string,
  input: HTMLInputElement,
  tooltip = "",
): HTMLElement {
  const span = el("span");
  span.textContent = label;
  if (tooltip !== "") tip(span, tooltip);

  const labelEl = el("label", "checkbox");
  labelEl.append(input, el("i"), span);

  const col = el("div", "col-xs-10 col-xs-offset-2");
  col.appendChild(labelEl);

  const row = el("div", "row middle-xs");
  row.appendChild(col);
  return row;
}
