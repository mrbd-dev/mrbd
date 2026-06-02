import { MRBD_VIEWPORT_SIZE } from "@mrbd/core";

/** Minimal orientation shape consumed by the head pointer (alpha/beta). */
export type HeadOrientation = { heading: number | null; tilt: number | null };

export type HeadCursor = { x: number; y: number };

export type MrbdHeadPointerConfig = {
  /** Surface width in px. Defaults to the MRBD viewport width. */
  width?: number;
  /** Surface height in px. Defaults to the MRBD viewport height. */
  height?: number;
  /** Horizontal sensitivity (px per degree of yaw). */
  pxPerDegX?: number;
  /** Vertical sensitivity (px per degree of pitch). */
  pxPerDegY?: number;
  /** Low-pass smoothing factor 0..1 (higher = snappier, lower = smoother). */
  smooth?: number;
  /** Invert horizontal axis. Defaults true (matches on-device head direction). */
  invertX?: boolean;
  /** Invert vertical axis. Defaults true. */
  invertY?: boolean;
};

export type MrbdHeadPointer = {
  /** Capture the current head pose as the neutral center. Returns false if orientation is incomplete. */
  calibrate(orientation: HeadOrientation): boolean;
  /** Feed a new orientation sample; returns the smoothed, clamped cursor. */
  update(orientation: HeadOrientation): HeadCursor;
  isCalibrated(): boolean;
  /** Forget calibration and recenter the cursor. */
  reset(): void;
  /** Latest cursor position. */
  readonly cursor: HeadCursor;
};

const DEFAULTS = {
  pxPerDegX: 22,
  pxPerDegY: 26,
  smooth: 0.35,
  invertX: true,
  invertY: true,
} as const;

/** Shortest signed angular delta in degrees, handling 0/360 wraparound. */
function deltaDeg(angle: number, reference: number): number {
  return ((angle - reference + 540) % 360) - 180;
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

/**
 * Framework-agnostic head-pointer: maps device orientation (yaw/pitch) to a
 * cursor position on a fixed surface, relative to a calibrated neutral pose.
 */
export function createMrbdHeadPointer(config: MrbdHeadPointerConfig = {}): MrbdHeadPointer {
  const width = config.width ?? MRBD_VIEWPORT_SIZE.width;
  const height = config.height ?? MRBD_VIEWPORT_SIZE.height;
  const pxPerDegX = config.pxPerDegX ?? DEFAULTS.pxPerDegX;
  const pxPerDegY = config.pxPerDegY ?? DEFAULTS.pxPerDegY;
  const smooth = config.smooth ?? DEFAULTS.smooth;
  const invertX = config.invertX ?? DEFAULTS.invertX;
  const invertY = config.invertY ?? DEFAULTS.invertY;

  const centerX = width / 2;
  const centerY = height / 2;

  let alpha0: number | null = null;
  let beta0 = 0;
  let x = centerX;
  let y = centerY;

  return {
    calibrate(orientation) {
      if (orientation.heading == null || orientation.tilt == null) return false;
      alpha0 = orientation.heading;
      beta0 = orientation.tilt;
      x = centerX;
      y = centerY;
      return true;
    },
    update(orientation) {
      if (alpha0 == null || orientation.heading == null || orientation.tilt == null) {
        return { x, y };
      }
      const dA = deltaDeg(orientation.heading, alpha0);
      const dB = orientation.tilt - beta0;
      const targetX = clamp(centerX + (invertX ? -dA : dA) * pxPerDegX, width);
      const targetY = clamp(centerY + (invertY ? -dB : dB) * pxPerDegY, height);
      x += (targetX - x) * smooth;
      y += (targetY - y) * smooth;
      return { x, y };
    },
    isCalibrated() {
      return alpha0 != null;
    },
    reset() {
      alpha0 = null;
      x = centerX;
      y = centerY;
    },
    get cursor() {
      return { x, y };
    },
  };
}
