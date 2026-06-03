import { DPAD } from "@mrbd/core";

/**
 * The MRBD glasses surface a *pinch-and-hold* as a distinct synthetic key rather
 * than a long `Enter`: `event.key` is `"Unidentified"` with `keyCode` 0 (a normal
 * pinch is `Enter`/13). There is no auto-repeat and no usable hold duration — the
 * firmware does the long-press recognition and just emits this one-shot key.
 */
export const MRBD_PINCH_HOLD_KEY = "Unidentified";

/**
 * True when a keyboard event is the glasses' pinch-and-hold gesture. Matches the
 * `Unidentified`/keyCode-0 signature so it won't fire on a normal pinch (`Enter`).
 */
export function isMrbdPinchHold(event: Pick<KeyboardEvent, "key" | "keyCode">): boolean {
  return event.key === MRBD_PINCH_HOLD_KEY && event.keyCode === 0;
}

/** Semantic gestures the head keyboard understands. */
export type MrbdKeyboardGesture =
  | "select" // pinch / Enter -> type the hovered key (or pick a menu option)
  | "space" // swipe right
  | "delete" // swipe left
  | "word-menu" // swipe down -> predictive word menu
  | "recenter-menu" // swipe up -> recenter menu
  | "hold" // pinch-and-hold -> options menu (recalibrate / submit / close)
  | "back"; // Escape

/** Map a raw keyboard event to a keyboard gesture, or null if unhandled. */
export function gestureForKey(event: Pick<KeyboardEvent, "key" | "keyCode">): MrbdKeyboardGesture | null {
  if (isMrbdPinchHold(event)) return "hold";
  switch (event.key) {
    case DPAD.RIGHT:
      return "space";
    case DPAD.LEFT:
      return "delete";
    case DPAD.DOWN:
      return "word-menu";
    case DPAD.UP:
      return "recenter-menu";
    case DPAD.SELECT:
      return "select";
    case DPAD.BACK:
      return "back";
    default:
      return null;
  }
}

export const SWIPE_GESTURES: ReadonlySet<MrbdKeyboardGesture> = new Set([
  "space",
  "delete",
  "word-menu",
  "recenter-menu",
]);
