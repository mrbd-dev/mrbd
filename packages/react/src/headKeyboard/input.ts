import { DPAD } from "@mrbd/core";

/** Semantic gestures the head keyboard understands. */
export type MrbdKeyboardGesture =
  | "select" // pinch / Enter -> type the hovered key (or pick a menu option)
  | "space" // swipe right
  | "delete" // swipe left
  | "word-menu" // swipe down -> predictive word menu
  | "recenter-menu" // swipe up -> recenter menu
  | "back"; // Escape

/** Map a raw D-pad key to a keyboard gesture, or null if unhandled. */
export function gestureForKey(key: string): MrbdKeyboardGesture | null {
  switch (key) {
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
