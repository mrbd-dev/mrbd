import { MRBD_DEFAULT_WORDLIST } from "./wordlist.js";

/** A single 2D sample on the keyboard surface (area-relative pixels). */
export type MrbdSwipePoint = { x: number; y: number };

/** Map of a key's inserted value (a single lowercase letter) to its center. */
export type MrbdSwipeKeyPositions = Record<string, MrbdSwipePoint>;

/** A decoded word and its match cost (lower is better). */
export type MrbdSwipeCandidate = { word: string; score: number };

export type MrbdSwipeDecoderOptions = {
  /**
   * Vocabulary the decoder can produce, in rough frequency order (most common
   * first). Defaults to {@link MRBD_DEFAULT_WORDLIST}.
   */
  words?: string[];
  /** Points each gesture/template is resampled to before scoring. Default 64. */
  sampleCount?: number;
  /** Weight of the shape channel (normalized path similarity). Default 1. */
  shapeWeight?: number;
  /** Weight of the location channel (absolute path overlap). Default 0.4. */
  locationWeight?: number;
  /**
   * A candidate is only scored if its first/last key center is within this many
   * pixels of the gesture's start/end. This is SHARK2's start-end pruning and is
   * what keeps decoding fast over a large word list. Default 90.
   */
  pruneRadius?: number;
  /**
   * How strongly word frequency breaks ties between similarly-shaped words. 0
   * disables it (pure geometry). Default 0.35.
   */
  frequencyWeight?: number;
  /**
   * Extra weight on how closely the gesture's start/end line up with the word's
   * first/last key. The endpoints are the most reliable part of a swipe, so this
   * sharpens disambiguation between similarly-shaped words. 0 disables it.
   * Default 0.6.
   */
  endpointWeight?: number;
  /**
   * Cap on how many of the most frequent words become swipe templates. Bounds the
   * one-time template build and its memory on low-powered devices; the prediction
   * engine can still complete from the full list. Default 2000.
   */
  maxWords?: number;
};

/**
 * Decodes a swiped path (e.g. a head-aimed reticle trace) into the most likely
 * words by template matching, in the spirit of SHARK2 (Kristensson & Zhai 2004).
 *
 * For every word it builds an "ideal" template — the polyline through the center
 * of each of its letters — then compares the resampled gesture against each
 * template using a normalized *shape* channel (scale/translation invariant) and
 * an absolute *location* channel (rewards templates that physically overlap the
 * trace). Start/end pruning discards words whose first/last key isn't near the
 * gesture endpoints before the (more expensive) scoring runs.
 */
export type MrbdSwipeDecoder = {
  /**
   * Rank candidate words for a gesture. `keys` maps each typeable letter to its
   * current center on the surface (the same coordinate space as `path`).
   */
  decode(path: MrbdSwipePoint[], keys: MrbdSwipeKeyPositions, limit?: number): MrbdSwipeCandidate[];
};

function dist(a: MrbdSwipePoint, b: MrbdSwipePoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Total arc length of a polyline. */
function pathLength(points: MrbdSwipePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

/** Resample a polyline into exactly `n` points spaced evenly along its length. */
function resample(points: MrbdSwipePoint[], n: number): MrbdSwipePoint[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: n }, () => ({ ...points[0] }));

  const total = pathLength(points);
  // A zero-length path (all points identical) can't be spread out; clone it.
  if (total === 0) return Array.from({ length: n }, () => ({ ...points[0] }));

  const step = total / (n - 1);
  const out: MrbdSwipePoint[] = [{ ...points[0] }];
  let prev = points[0];
  let distSoFar = 0;
  let i = 1;

  while (out.length < n - 1 && i < points.length) {
    const next = points[i];
    const segLen = dist(prev, next);
    if (segLen === 0) {
      i++;
      continue;
    }
    if (distSoFar + segLen >= step * out.length) {
      const need = step * out.length - distSoFar;
      const t = need / segLen;
      const p = { x: prev.x + (next.x - prev.x) * t, y: prev.y + (next.y - prev.y) * t };
      out.push(p);
      prev = p; // continue interpolating along the same segment
      distSoFar = step * (out.length - 1);
    } else {
      distSoFar += segLen;
      prev = next;
      i++;
    }
  }
  while (out.length < n) out.push({ ...points[points.length - 1] });
  return out;
}

/** Translate to centroid origin and scale so the longest side spans 1 unit. */
function normalizeShape(points: MrbdSwipePoint[]): MrbdSwipePoint[] {
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  return points.map((p) => ({ x: (p.x - cx) / span, y: (p.y - cy) / span }));
}

/** Mean point-to-point distance between two equal-length point lists. */
function meanPointDistance(a: MrbdSwipePoint[], b: MrbdSwipePoint[]): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += dist(a[i], b[i]);
  return total / a.length;
}

type Template = {
  word: string;
  /** Frequency rank in [0,1] (0 = most common). */
  freq: number;
  /** First/last key centers, kept separately for cheap start/end pruning. */
  first: MrbdSwipePoint;
  last: MrbdSwipePoint;
  /** Ideal path through the word's key centers, resampled to `sampleCount`. */
  resampled: MrbdSwipePoint[];
  /** `resampled` pre-normalized for the shape channel (computed once per layout). */
  normalized: MrbdSwipePoint[];
};

/** A stable signature for a key layout so templates can be cached between swipes. */
function keysSignature(keys: MrbdSwipeKeyPositions): string {
  return Object.keys(keys)
    .sort()
    .map((k) => `${k}:${Math.round(keys[k].x)},${Math.round(keys[k].y)}`)
    .join("|");
}

export function createMrbdSwipeDecoder(options: MrbdSwipeDecoderOptions = {}): MrbdSwipeDecoder {
  const words = options.words ?? MRBD_DEFAULT_WORDLIST;
  const sampleCount = options.sampleCount ?? 64;
  const shapeWeight = options.shapeWeight ?? 1;
  const locationWeight = options.locationWeight ?? 0.4;
  const pruneRadius = options.pruneRadius ?? 90;
  const frequencyWeight = options.frequencyWeight ?? 0.35;
  const endpointWeight = options.endpointWeight ?? 0.6;
  const maxWords = options.maxWords ?? 2000;

  // Unique, lowercased words capped to the most frequent `maxWords`. Frequency is
  // derived from list order (rank), so `freq` is in [0,1] with 0 = most common.
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const raw of words) {
    const w = raw.toLowerCase();
    if (!w || seen.has(w)) continue;
    seen.add(w);
    deduped.push(w);
    if (deduped.length >= maxWords) break;
  }
  const ranked = deduped.map((word, i) => ({
    word,
    freq: deduped.length > 1 ? i / (deduped.length - 1) : 0,
  }));

  let cacheSig: string | null = null;
  let templates: Template[] = [];

  /**
   * Build every word's template for the current key layout. Resampling and shape
   * normalization happen here (once per layout) so decoding a gesture is just
   * cheap distance sums — important on the glasses' limited CPU.
   */
  function buildTemplates(keys: MrbdSwipeKeyPositions, sig: string): Template[] {
    const out: Template[] = [];
    for (const { word, freq } of ranked) {
      const anchors: MrbdSwipePoint[] = [];
      let ok = true;
      for (const ch of word) {
        const pos = keys[ch];
        if (!pos) {
          ok = false; // a letter with no key on this layout (e.g. punctuation) — skip word
          break;
        }
        // Collapse consecutive duplicate letters to one anchor (same key).
        const last = anchors[anchors.length - 1];
        if (!last || last.x !== pos.x || last.y !== pos.y) anchors.push({ x: pos.x, y: pos.y });
      }
      if (!ok || anchors.length === 0) continue;
      const resampled =
        anchors.length === 1
          ? Array.from({ length: sampleCount }, () => ({ ...anchors[0] }))
          : resample(anchors, sampleCount);
      out.push({
        word,
        freq,
        first: anchors[0],
        last: anchors[anchors.length - 1],
        resampled,
        normalized: normalizeShape(resampled),
      });
    }
    cacheSig = sig;
    return out;
  }

  return {
    decode(path, keys, limit = 5) {
      if (path.length < 2) return [];
      const sig = keysSignature(keys);
      if (sig !== cacheSig) templates = buildTemplates(keys, sig);
      if (templates.length === 0) return [];

      const start = path[0];
      const end = path[path.length - 1];

      const gestureResampled = resample(path, sampleCount);
      const gestureShape = normalizeShape(gestureResampled);

      const scored: MrbdSwipeCandidate[] = [];
      for (const t of templates) {
        // ---- start/end pruning (cheap, discards most of the vocabulary) ----
        const dStart = dist(t.first, start);
        const dEnd = dist(t.last, end);
        if (dStart > pruneRadius || dEnd > pruneRadius) continue;

        // ---- shape channel: scale/translation-invariant similarity ----
        const shape = meanPointDistance(gestureShape, t.normalized);

        // ---- location channel: absolute overlap, normalized to key pitch ----
        const location = meanPointDistance(gestureResampled, t.resampled) / pruneRadius;

        // ---- endpoint channel: the first/last keys are the most reliable ----
        const endpoints = (dStart + dEnd) / (2 * pruneRadius);

        const geometry =
          shapeWeight * shape + locationWeight * location + endpointWeight * endpoints;
        const cost = geometry * (1 + frequencyWeight * t.freq);
        scored.push({ word: t.word, score: cost });
      }

      scored.sort((a, b) => a.score - b.score);
      return scored.slice(0, limit);
    },
  };
}
