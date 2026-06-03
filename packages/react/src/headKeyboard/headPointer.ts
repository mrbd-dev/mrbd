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
  /**
   * Adaptive-filter minimum cutoff frequency, in Hz. This is the smoothing that
   * applies when the head is (nearly) still: lower values remove more jitter for
   * precise/slow movements at the cost of a little extra latency. Default 0.4.
   */
  minCutoff?: number;
  /**
   * Adaptive-filter speed coefficient. Higher values reduce lag during fast head
   * movements (the cutoff opens up as angular velocity rises). Default 0.02.
   */
  beta?: number;
  /**
   * Legacy fixed low-pass factor 0..1 (higher = snappier, lower = smoother).
   * Setting this opts out of the adaptive filter and restores the old constant
   * smoothing behaviour. Prefer `minCutoff` / `beta` instead.
   * @deprecated Use `minCutoff` / `beta` for jitter-free precise aiming.
   */
  smooth?: number;
  /** Invert horizontal axis. Defaults false (head left moves the cursor left). */
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
  minCutoff: 0.4,
  beta: 0.02,
  smooth: 0.35,
  invertX: false,
  invertY: true,
} as const;

/** Derivative cutoff for the 1€ filter; 1Hz is the standard, stable default. */
const DERIVATIVE_CUTOFF = 1.0;

/** Shortest signed angular delta in degrees, handling 0/360 wraparound. */
function deltaDeg(angle: number, reference: number): number {
  return ((angle - reference + 540) % 360) - 180;
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Smoothing factor for a one-pole low-pass given a cutoff (Hz) and timestep (s). */
function lowpassAlpha(cutoffHz: number, dtSec: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSec);
}

type OneEuroFilter = {
  /** Filter a sample taken at time `t` (ms). */
  filter(value: number, t: number): number;
  reset(): void;
};

/**
 * One Euro filter (Casiez et al.): an adaptive low-pass whose cutoff rises with
 * signal velocity. Slow/precise motion is filtered hard (kills jitter); fast
 * motion passes through with little lag. Ideal for head-aimed pointers.
 */
function createOneEuroFilter(minCutoff: number, beta: number): OneEuroFilter {
  let xHat: number | null = null;
  let dxHat = 0;
  let tPrev = 0;

  return {
    filter(value, t) {
      if (xHat == null) {
        xHat = value;
        tPrev = t;
        return value;
      }
      let dt = (t - tPrev) / 1000;
      if (!(dt > 0)) dt = 1 / 60; // guard against duplicate/backwards timestamps
      tPrev = t;

      const dx = (value - xHat) / dt;
      const aD = lowpassAlpha(DERIVATIVE_CUTOFF, dt);
      dxHat = aD * dx + (1 - aD) * dxHat;

      const cutoff = minCutoff + beta * Math.abs(dxHat);
      const a = lowpassAlpha(cutoff, dt);
      xHat = a * value + (1 - a) * xHat;
      return xHat;
    },
    reset() {
      xHat = null;
      dxHat = 0;
    },
  };
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
  const invertX = config.invertX ?? DEFAULTS.invertX;
  const invertY = config.invertY ?? DEFAULTS.invertY;

  // Adaptive (1€) smoothing is the default; passing `smooth` opts back into the
  // legacy constant low-pass for callers that explicitly tuned the old value.
  const useLegacySmooth = config.smooth != null;
  const smooth = config.smooth ?? DEFAULTS.smooth;
  const minCutoff = config.minCutoff ?? DEFAULTS.minCutoff;
  const beta = config.beta ?? DEFAULTS.beta;

  // Smooth the angular signal (degrees) rather than pixels so sensitivity tuning
  // and the filter cutoffs stay independent.
  const filterA = createOneEuroFilter(minCutoff, beta);
  const filterB = createOneEuroFilter(minCutoff, beta);

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
      filterA.reset();
      filterB.reset();
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

      if (useLegacySmooth) {
        const targetX = clamp(centerX + (invertX ? -dA : dA) * pxPerDegX, width);
        const targetY = clamp(centerY + (invertY ? -dB : dB) * pxPerDegY, height);
        x += (targetX - x) * smooth;
        y += (targetY - y) * smooth;
        return { x, y };
      }

      const t = nowMs();
      const smoothA = filterA.filter(dA, t);
      const smoothB = filterB.filter(dB, t);
      x = clamp(centerX + (invertX ? -smoothA : smoothA) * pxPerDegX, width);
      y = clamp(centerY + (invertY ? -smoothB : smoothB) * pxPerDegY, height);
      return { x, y };
    },
    isCalibrated() {
      return alpha0 != null;
    },
    reset() {
      alpha0 = null;
      filterA.reset();
      filterB.reset();
      x = centerX;
      y = centerY;
    },
    get cursor() {
      return { x, y };
    },
  };
}
