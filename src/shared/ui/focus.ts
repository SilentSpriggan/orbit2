const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "audio[controls]",
  "video[controls]",
  "[contenteditable=true]",
].join(",");

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("inert") && el.getClientRects().length > 0,
  );
}

/** Keep Tab / Shift+Tab inside `root`. Call from a keydown handler. */
export function trapTab(e: KeyboardEvent, root: HTMLElement): void {
  if (e.key !== "Tab") return;
  const items = getFocusable(root);
  if (items.length === 0) {
    e.preventDefault();
    root.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}

/** Stack of open layers so Esc only closes the topmost one. */
const layers: symbol[] = [];

export function pushLayer(): symbol {
  const s = Symbol("layer");
  layers.push(s);
  return s;
}

export function popLayer(s: symbol): void {
  const i = layers.lastIndexOf(s);
  if (i >= 0) layers.splice(i, 1);
}

export function isTopLayer(s: symbol): boolean {
  return layers[layers.length - 1] === s;
}
