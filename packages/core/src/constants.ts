export const MRBD_VIEWPORT_SIZE = {
  width: 600,
  height: 600,
} as const;

export const MRBD_SAFE_MARGIN = 8;

export const MRBD_MIN_TARGET_SIZE = 88;

export const DPAD = {
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  SELECT: "Enter",
  BACK: "Escape",
} as const;

export type DpadKey = (typeof DPAD)[keyof typeof DPAD];

export function isDpadKey(key: string): key is DpadKey {
  return Object.values(DPAD).includes(key as DpadKey);
}
