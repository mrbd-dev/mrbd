import { MRBD_DEFAULT_KEYBOARD_LAYOUT, MRBD_NUMERIC_KEYBOARD_LAYOUT, type MrbdKeyboardLayout } from "./layout.js";
import type { MrbdTextInputRequest } from "./MrbdKeyboardContext.js";

/** An element the head keyboard can drive on behalf of the wearer. */
export type MrbdBindableElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

/**
 * `<input type="...">` values that represent free-form / numeric text the head
 * keyboard can fill. Anything else (checkbox, radio, button, range, color, file,
 * native date/time pickers, ...) has its own UI and is left untouched.
 */
const TEXT_INPUT_TYPES = new Set([
  "",
  "text",
  "search",
  "url",
  "email",
  "tel",
  "number",
  "password",
]);

const NUMERIC_INPUT_TYPES = new Set(["number", "tel"]);
const NUMERIC_INPUT_MODES = new Set(["numeric", "decimal", "tel"]);

/** Explicit opt-out: `data-mrbd-keyboard="off"` on the field or any ancestor. */
const OPT_OUT_SELECTOR = '[data-mrbd-keyboard="off"]';

function isInput(el: Element): el is HTMLInputElement {
  return el.tagName === "INPUT";
}

function isTextArea(el: Element): el is HTMLTextAreaElement {
  return el.tagName === "TEXTAREA";
}

function isContentEditable(el: Element): el is HTMLElement {
  return el instanceof HTMLElement && el.isContentEditable;
}

/**
 * Whether the head keyboard should take over this element. True for text-like
 * `<input>`s, `<textarea>`s, and `contenteditable` hosts that are editable and
 * not opted out.
 */
export function isMrbdEligibleField(el: Element | null): el is MrbdBindableElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.closest(OPT_OUT_SELECTOR)) return false;

  if (isInput(el)) {
    if (el.disabled || el.readOnly) return false;
    return TEXT_INPUT_TYPES.has(el.type.toLowerCase());
  }
  if (isTextArea(el)) {
    return !el.disabled && !el.readOnly;
  }
  if (isContentEditable(el)) {
    return true;
  }
  return false;
}

/** Read the current text out of an eligible field. */
export function readMrbdFieldValue(el: MrbdBindableElement): string {
  if (isInput(el) || isTextArea(el)) return el.value;
  return el.textContent ?? "";
}

/**
 * Write text back into the field. For `<input>`/`<textarea>` this uses the
 * native value setter and dispatches `input`/`change` so React controlled
 * components observe the update; `contenteditable` hosts get `textContent` plus
 * a bubbling `input` event.
 */
export function setMrbdFieldValue(el: MrbdBindableElement, value: string): void {
  if (isInput(el) || isTextArea(el)) {
    const proto = isTextArea(el) ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  el.textContent = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function labelTextFor(el: MrbdBindableElement): string | undefined {
  if ((isInput(el) || isTextArea(el)) && el.labels && el.labels.length > 0) {
    const text = el.labels[0]?.textContent?.trim();
    if (text) return text;
  }
  return undefined;
}

/** Derive the keyboard title (shown above the keys) from the field. */
export function mrbdFieldTitle(el: MrbdBindableElement): string | undefined {
  const explicit = el.dataset.mrbdKeyboardTitle?.trim();
  if (explicit) return explicit;

  if (isInput(el) || isTextArea(el)) {
    const placeholder = el.placeholder?.trim();
    if (placeholder) return placeholder;
  }
  const ariaLabel = el.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  const label = labelTextFor(el);
  if (label) return label;

  if (isInput(el) || isTextArea(el)) {
    const name = el.name?.trim();
    if (name) return name;
  }
  return undefined;
}

/** Pick the layout for a field: numeric for number/tel-style inputs. */
export function mrbdLayoutForField(
  el: MrbdBindableElement,
  layouts?: { default?: MrbdKeyboardLayout; numeric?: MrbdKeyboardLayout },
): MrbdKeyboardLayout {
  const fallback = layouts?.default ?? MRBD_DEFAULT_KEYBOARD_LAYOUT;
  const numeric = layouts?.numeric ?? MRBD_NUMERIC_KEYBOARD_LAYOUT;

  const explicit = el.dataset.mrbdKeyboardLayout?.toLowerCase();
  if (explicit === "numeric") return numeric;
  if (explicit === "default" || explicit === "text") return fallback;

  const inputMode = el.getAttribute("inputmode")?.toLowerCase();
  if (inputMode && NUMERIC_INPUT_MODES.has(inputMode)) return numeric;

  if (isInput(el) && NUMERIC_INPUT_TYPES.has(el.type.toLowerCase())) return numeric;

  return fallback;
}

function mrbdFieldMaxLength(el: MrbdBindableElement): number | undefined {
  if ((isInput(el) || isTextArea(el)) && el.maxLength > 0) return el.maxLength;
  const attr = el.dataset.mrbdKeyboardMaxlength;
  if (attr) {
    const parsed = Number.parseInt(attr, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

/** Build the `requestText` request that mirrors a field's intent. */
export function mrbdFieldRequest(
  el: MrbdBindableElement,
  layouts?: { default?: MrbdKeyboardLayout; numeric?: MrbdKeyboardLayout },
): MrbdTextInputRequest {
  return {
    initialValue: readMrbdFieldValue(el),
    title: mrbdFieldTitle(el),
    layout: mrbdLayoutForField(el, layouts),
    maxLength: mrbdFieldMaxLength(el),
  };
}

/**
 * Open the head keyboard for a field, then write the result back and restore
 * focus so D-pad navigation resumes from the field. No-op write when cancelled.
 */
export async function openMrbdKeyboardForField(
  el: MrbdBindableElement,
  requestText: (request?: MrbdTextInputRequest) => Promise<string | null>,
  layouts?: { default?: MrbdKeyboardLayout; numeric?: MrbdKeyboardLayout },
): Promise<string | null> {
  const result = await requestText(mrbdFieldRequest(el, layouts));
  if (result !== null) setMrbdFieldValue(el, result);
  if (typeof el.focus === "function") {
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }
  return result;
}
