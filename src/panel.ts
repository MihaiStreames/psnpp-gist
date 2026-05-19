type JQuery = { tipTip(opts: object): JQuery; off(events: string): JQuery };
export const jq = (unsafeWindow as unknown as { $: (el: Element) => JQuery }).$;

const TIP_BASE = { maxWidth: '500px', edgeOffset: 0, delay: 0, fadeIn: 50, fadeOut: 50 };

export function tip(
  el: Element,
  content: string,
  position: 'top' | 'bottom' | 'left' | 'right' = 'bottom',
): void {
  if (content !== '') jq(el).tipTip({ ...TIP_BASE, defaultPosition: position, content });
}

function make(tag: string, classes = ''): HTMLElement {
  const e = document.createElement(tag);
  if (classes !== '') e.className = classes;
  return e;
}

export function panelSection(title: string, ...children: HTMLElement[]): HTMLElement {
  const h3 = make('h3');
  h3.textContent = title;

  const grow = make('div', 'grow');
  grow.appendChild(h3);

  const titleDiv = make('div', 'title center flex v-align');
  titleDiv.appendChild(grow);

  const box = make('div', 'box no-top-border form');
  box.style.padding = '10px';
  box.append(...children);

  const col = make('div', 'col-xs-12');
  col.append(titleDiv, box);

  const row = make('div', 'row');
  row.appendChild(col);
  return row;
}

export function panelInputRow(label: string, input: HTMLInputElement, tooltip = ''): HTMLElement {
  const span = make('span', 'small-title');
  span.textContent = label;

  const labelCol = make('div', 'col-xs-2');
  labelCol.style.textAlign = 'right';
  labelCol.appendChild(span);

  const labelEl = make('label', 'input') as HTMLLabelElement;
  labelEl.append(input, make('i'));

  const inputCol = make('div', 'col-xs-10');
  inputCol.appendChild(labelEl);

  const row = make('div', 'row middle-xs');
  row.style.cssText = 'margin-top: 10px; margin-bottom: 10px;';
  row.append(labelCol, inputCol);

  if (tooltip !== '') tip(input, tooltip);
  return row;
}

export function panelCheckboxRow(
  label: string,
  input: HTMLInputElement,
  tooltip = '',
): HTMLElement {
  const span = make('span');
  span.textContent = label;
  if (tooltip !== '') tip(span, tooltip);

  const labelEl = make('label', 'checkbox') as HTMLLabelElement;
  labelEl.append(input, make('i'), span);

  const col = make('div', 'col-xs-10 col-xs-offset-2');
  col.appendChild(labelEl);

  const row = make('div', 'row middle-xs');
  row.appendChild(col);
  return row;
}
