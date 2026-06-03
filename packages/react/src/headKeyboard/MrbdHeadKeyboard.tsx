import { MRBD_VIEWPORT_SIZE } from "@mrbd/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MrbdHeadPointerConfig } from "./headPointer.js";
import { gestureForKey, type MrbdKeyboardGesture } from "./input.js";
import { MRBD_DEFAULT_KEYBOARD_LAYOUT, type MrbdKeyboardLayout } from "./layout.js";
import { createMrbdPredictionEngine, type MrbdPredictionEngine } from "./prediction.js";
import {
  createMrbdSwipeDecoder,
  type MrbdSwipeDecoder,
  type MrbdSwipeKeyPositions,
  type MrbdSwipePoint,
} from "./swipe.js";
import { useMrbdHeadPointer } from "./useMrbdHeadPointer.js";

export type MrbdHeadKeyboardProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onCancel?: () => void;
  title?: string;
  layout?: MrbdKeyboardLayout;
  prediction?: MrbdPredictionEngine;
  config?: MrbdHeadPointerConfig;
  /** Suggestions shown in the bar / word menu. Default 5. */
  suggestionCount?: number;
  /**
   * Swipe-to-type decoder. A bare pinch-and-hold starts a swipe word; aim across
   * the letters and pinch (Enter) to commit the best match. Defaults to a
   * decoder built from the prediction word list. Pass `null` to disable swiping.
   */
  swipeDecoder?: MrbdSwipeDecoder | null;
};

const ARROW_ENTER_GUARD = 240; // ignore an Enter that piggybacks a swipe
const ENTER_CLICK_WINDOW = 1200; // a pinch fires Enter + click; ignore the trailing click
const HOVER_MAX_DIST = 70;
// A pinch (Enter) immediately followed by a pinch-and-hold (Unidentified) within
// this window opens the command menu. A bare hold (no preceding Enter) is left
// unbound — reserved for starting a swipe word in the swipe keyboard.
const HOLD_COMBO_WINDOW = 1000;

type MenuKind = "word" | "recenter" | "directions" | "settings" | null;

const STYLE_ID = "mrbd-head-keyboard-style";
const CSS = `
.mrbd-kb { position: relative; width: ${MRBD_VIEWPORT_SIZE.width}px; height: ${MRBD_VIEWPORT_SIZE.height}px; box-sizing: border-box; padding: 8px; display: flex; flex-direction: column; gap: 6px; background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-user-select: none; user-select: none; }
.mrbd-kb-output { min-height: 50px; background: #14161b; border: 1.5px solid #2a2d33; border-radius: 12px; padding: 8px 14px; font-size: 23px; font-weight: 600; line-height: 1.25; word-break: break-word; overflow: hidden; }
.mrbd-kb-output .cur { color: #00d4ff; }
.mrbd-kb-output .caret { color: #00d4ff; }
.mrbd-kb-output .ph { color: #6b6f76; font-weight: 400; font-size: 16px; }
.mrbd-kb-suggest { display: flex; gap: 6px; height: 38px; }
.mrbd-kb-sug { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background: #101319; border: 1.5px solid #23262d; border-radius: 9px; font-size: 15px; font-weight: 600; color: #cfd2d6; overflow: hidden; white-space: nowrap; }
.mrbd-kb-sug.empty { color: #4a4e55; font-weight: 400; }
.mrbd-kb-sug .rank { font-size: 11px; color: #00d4ff; }
.mrbd-kb-area { position: relative; flex: 1; display: flex; flex-direction: column; justify-content: center; }
.mrbd-kb-rows { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.mrbd-kb-row { display: flex; gap: 6px; justify-content: center; }
.mrbd-kb-key { width: 53px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 23px; font-weight: 600; color: #fff; background: #1c1e21; border: 2px solid transparent; border-radius: 10px; transition: background 100ms ease, border-color 100ms ease, transform 100ms ease; }
.mrbd-kb-target.mrbd-kb-hover { border-color: #00d4ff; background: rgba(0,212,255,0.16); transform: scale(1.08); z-index: 2; }
.mrbd-kb-target.mrbd-kb-flash { background: #00d4ff; color: #001014; }
.mrbd-kb-corner { position: absolute; top: 0; width: 70px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; border-radius: 10px; background: #14161b; border: 2px solid transparent; z-index: 3; }
.mrbd-kb-corner.cancel { left: 0; color: #ff6b6b; }
.mrbd-kb-corner.done { right: 0; color: #00d4ff; }
.mrbd-kb-reticle { position: absolute; width: 24px; height: 24px; margin-left: -12px; margin-top: -12px; border: 2px solid #fff; border-radius: 50%; pointer-events: none; z-index: 30; box-shadow: 0 0 12px rgba(255,255,255,0.7); transition: border-color 100ms ease, box-shadow 100ms ease; }
.mrbd-kb-reticle::after { content: ""; position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; margin: -2px 0 0 -2px; background: #00d4ff; border-radius: 50%; }
.mrbd-kb-reticle.swiping { border-color: #00ffa3; box-shadow: 0 0 16px rgba(0,255,163,0.9); }
.mrbd-kb-trail { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 29; overflow: visible; }
.mrbd-kb-trail polyline { fill: none; stroke: #00ffa3; stroke-width: 5; stroke-linejoin: round; stroke-linecap: round; opacity: 0.85; }
.mrbd-kb-swipebadge { position: absolute; top: 0; left: 50%; transform: translateX(-50%); z-index: 31; font-size: 12px; font-weight: 800; letter-spacing: 2px; color: #001014; background: #00ffa3; border-radius: 0 0 8px 8px; padding: 3px 12px; box-shadow: 0 0 14px rgba(0,255,163,0.6); }
.mrbd-kb-sug.alt { color: #00ffa3; border-color: rgba(0,255,163,0.45); }
.mrbd-kb-sug.alt .rank { color: #00ffa3; }
.mrbd-kb-sug.alt.top { background: rgba(0,255,163,0.16); }
.mrbd-kb-menu { position: absolute; inset: 0; background: rgba(0,0,0,0.82); z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; }
.mrbd-kb-menu h2 { margin: 0; font-size: 16px; color: #00d4ff; letter-spacing: 1px; }
.mrbd-kb-menu .opts { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: center; }
.mrbd-kb-opt { min-width: 120px; height: 60px; padding: 0 18px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: #fff; background: #1c1e21; border: 2px solid transparent; border-radius: 12px; }
.mrbd-kb-menu .hint { font-size: 12px; color: #6b6f76; }
.mrbd-kb-settings { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 380px; }
.mrbd-kb-settings .srow { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; font-size: 17px; font-weight: 700; color: #6b6f76; background: #14161b; border: 1.5px solid #23262d; border-radius: 10px; }
.mrbd-kb-settings .srow span { font-size: 12px; font-weight: 400; color: #4a4e55; }
.mrbd-kb-dirmenu { position: absolute; inset: 0; z-index: 25; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 20px; box-sizing: border-box; background: rgba(5,7,10,0.74); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); animation: mrbd-kb-fade 120ms ease-out; }
@keyframes mrbd-kb-fade { from { opacity: 0; } to { opacity: 1; } }
.mrbd-kb-dir-row { display: flex; align-items: center; justify-content: center; gap: 16px; }
.mrbd-kb-dir { display: flex; flex-direction: column; align-items: center; gap: 1px; min-width: 116px; padding: 9px 16px; background: #0f1218; border: 2px solid #00d4ff; border-radius: 14px; box-shadow: 0 0 18px rgba(0,212,255,0.22); }
.mrbd-kb-dir.down { flex-direction: column-reverse; }
.mrbd-kb-dir .ar { font-size: 32px; line-height: 1; font-weight: 700; color: #00d4ff; }
.mrbd-kb-dir .lbl { font-size: 18px; font-weight: 800; color: #fff; letter-spacing: 0.3px; }
.mrbd-kb-dir .sub { font-size: 11px; color: #9aa0a6; }
.mrbd-kb-dir-hub { width: 90px; height: 90px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; letter-spacing: 3px; color: #00d4ff; border: 2px dashed #2a2d33; }
.mrbd-kb-dir-foot { margin-top: 4px; font-size: 11px; color: #6b6f76; text-align: center; }
.mrbd-kb-footer { font-size: 10px; color: #6b6f76; text-align: center; line-height: 1.4; }
.mrbd-kb-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.9); z-index: 40; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 24px; text-align: center; }
.mrbd-kb-overlay h1 { margin: 0; font-size: 22px; color: #00d4ff; }
.mrbd-kb-overlay p { margin: 0; font-size: 14px; color: #b0b3b8; line-height: 1.5; max-width: 470px; }
.mrbd-kb-start { height: 64px; padding: 0 28px; font: inherit; font-size: 18px; font-weight: 700; letter-spacing: 1px; color: #001014; background: #00d4ff; border: 2px solid #fff; border-radius: 12px; box-shadow: 0 0 22px rgba(0,212,255,0.5); }
`;

function useInjectedStyle() {
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

function currentWord(value: string): string {
  const match = value.match(/[a-z']+$/i);
  return match ? match[0] : "";
}

type Center = { el: HTMLElement; cx: number; cy: number; kind: string; value: string };

export function MrbdHeadKeyboard({
  value,
  onChange,
  onSubmit,
  onCancel,
  title,
  layout = MRBD_DEFAULT_KEYBOARD_LAYOUT,
  prediction,
  config,
  suggestionCount = 5,
  swipeDecoder,
}: MrbdHeadKeyboardProps) {
  useInjectedStyle();

  const engine = useMemo<MrbdPredictionEngine>(
    () => prediction ?? createMrbdPredictionEngine(),
    [prediction],
  );
  // `undefined` => build a default decoder; `null` => swiping disabled.
  const swiper = useMemo<MrbdSwipeDecoder | null>(
    () => (swipeDecoder === undefined ? createMrbdSwipeDecoder() : swipeDecoder),
    [swipeDecoder],
  );
  const pointer = useMrbdHeadPointer(config);

  const [phase, setPhase] = useState<"calibrate" | "type">("calibrate");
  const [menuKind, setMenuKind] = useState<MenuKind>(null);
  const [swiping, setSwiping] = useState(false);
  // Alternative words from the last swipe (best match inserted first); the wearer
  // can swipe left/right to cycle them or swipe down to pick from the menu.
  const [swipeAlternatives, setSwipeAlternatives] = useState<string[]>([]);
  const [swipeAltIndex, setSwipeAltIndex] = useState(0);

  const areaRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<SVGPolylineElement>(null);
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const centersRef = useRef<Center[]>([]);
  // Letter -> key center, rebuilt on each "type" measure; feeds the swipe decoder.
  const keysRef = useRef<MrbdSwipeKeyPositions>({});
  const hoverRef = useRef<HTMLElement | null>(null);
  const lastArrowRef = useRef(0);
  const lastEnterRef = useRef(0);
  // Swipe-in-progress flag + recorded reticle path, kept in refs for the rAF loop.
  const swipingRef = useRef(false);
  const swipePathRef = useRef<MrbdSwipePoint[]>([]);
  // Value snapshot taken when a swipe word commits, so picking an alternative can
  // cleanly swap it for the chosen word.
  const swipeBaseRef = useRef("");
  const swipeAltsRef = useRef<string[]>([]);
  swipeAltsRef.current = swipeAlternatives;
  const swipeAltIndexRef = useRef(0);
  swipeAltIndexRef.current = swipeAltIndex;
  // Timestamp of the last Enter/select keydown, and a snapshot of `value` taken
  // just before that select inserted a character — used to detect the Enter→hold
  // combo and to undo the character the Enter typed when it opens the menu.
  const lastSelectAtRef = useRef(0);
  const revertValueRef = useRef<string | null>(null);

  // keep latest value/menu in refs for the rAF + key handlers
  const valueRef = useRef(value);
  valueRef.current = value;
  const menuRef = useRef<MenuKind>(menuKind);
  menuRef.current = menuKind;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const suggestions = useMemo(
    () => engine.suggest(currentWord(value), suggestionCount),
    [engine, value, suggestionCount],
  );
  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;

  // ---- measuring head-aim targets ----
  const measure = useCallback((scope: "type" | "menu") => {
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const nodes = area.querySelectorAll<HTMLElement>(`[data-kbtarget][data-scope="${scope}"]`);
    const centers = Array.from(nodes).map((el) => {
      const box = el.getBoundingClientRect();
      return {
        el,
        cx: box.left - rect.left + box.width / 2,
        cy: box.top - rect.top + box.height / 2,
        kind: el.dataset.kind ?? "char",
        value: el.dataset.value ?? "",
      };
    });
    centersRef.current = centers;
    if (scope === "type") {
      // Rebuild the single-letter key map the swipe decoder traces over.
      const keys: MrbdSwipeKeyPositions = {};
      for (const c of centers) {
        if (c.kind === "char" && c.value.length === 1) keys[c.value] = { x: c.cx, y: c.cy };
      }
      keysRef.current = keys;
    }
  }, []);

  const setHover = useCallback((el: HTMLElement | null) => {
    if (hoverRef.current === el) return;
    hoverRef.current?.classList.remove("mrbd-kb-hover");
    hoverRef.current = el;
    el?.classList.add("mrbd-kb-hover");
  }, []);

  const flash = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    el.classList.add("mrbd-kb-flash");
    setTimeout(() => el.classList.remove("mrbd-kb-flash"), 120);
  }, []);

  // ---- swipe alternatives ----
  const clearAlternatives = useCallback(() => {
    if (swipeAltsRef.current.length) {
      setSwipeAlternatives([]);
      setSwipeAltIndex(0);
    }
  }, []);

  // ---- text ops ----
  const insertChar = useCallback(
    (ch: string) => {
      clearAlternatives();
      onChange(valueRef.current + ch);
    },
    [clearAlternatives, onChange],
  );
  const backspace = useCallback(() => {
    clearAlternatives();
    onChange(valueRef.current.slice(0, -1));
  }, [clearAlternatives, onChange]);
  const acceptWord = useCallback(
    (word: string) => {
      clearAlternatives();
      const v = valueRef.current;
      const cw = currentWord(v);
      const head = cw ? v.slice(0, v.length - cw.length) : v;
      onChange(head + word + " ");
      engine.learn(word);
    },
    [clearAlternatives, engine, onChange],
  );
  // Replace the just-swiped word with a chosen alternative (same insertion point)
  // and dismiss the alternatives — used by the swipe-down word menu.
  const pickAlternative = useCallback(
    (word: string) => {
      onChange(swipeBaseRef.current + word + " ");
      engine.learn(word);
      setSwipeAlternatives([]);
      setSwipeAltIndex(0);
    },
    [engine, onChange],
  );

  // Step through the swipe alternatives in place after a swipe. Right advances to
  // the next match (clamped at the last). Left steps back toward the best match;
  // a left at the first match deletes the whole swiped word and dismisses. The
  // alternatives stay on screen while cycling; typing or a new swipe dismisses.
  const stepAlternative = useCallback(
    (dir: 1 | -1) => {
      const alts = swipeAltsRef.current;
      if (!alts.length) return;
      const idx = swipeAltIndexRef.current;
      if (dir === -1 && idx === 0) {
        // first back-swipe after a swipe word -> delete the whole word
        onChange(swipeBaseRef.current);
        setSwipeAlternatives([]);
        setSwipeAltIndex(0);
        return;
      }
      const next = dir === 1 ? Math.min(alts.length - 1, idx + 1) : idx - 1;
      if (next === idx) return; // already at the far end — nothing to do
      setSwipeAltIndex(next);
      onChange(swipeBaseRef.current + alts[next] + " ");
    },
    [onChange],
  );

  // ---- menus ----
  const openMenu = useCallback(
    (kind: Exclude<MenuKind, null>) => {
      if (kind === "word" && suggestionsRef.current.length === 0 && swipeAltsRef.current.length === 0)
        return;
      setMenuKind(kind);
      requestAnimationFrame(() => measure("menu"));
      setHover(null);
    },
    [measure, setHover],
  );
  const closeMenu = useCallback(() => {
    setMenuKind(null);
    setHover(null);
    requestAnimationFrame(() => measure("type"));
  }, [measure, setHover]);

  // ---- swipe-to-type ----
  const clearTrail = useCallback(() => {
    trailRef.current?.setAttribute("points", "");
  }, []);

  const startSwipe = useCallback(() => {
    if (!swiper || menuRef.current) return;
    const c = pointer.read();
    swipeBaseRef.current = valueRef.current;
    swipePathRef.current = [{ x: c.x, y: c.y }];
    swipingRef.current = true;
    setSwiping(true);
    setSwipeAlternatives([]);
    setHover(null);
    clearTrail();
  }, [clearTrail, pointer, setHover, swiper]);

  const cancelSwipe = useCallback(() => {
    swipingRef.current = false;
    swipePathRef.current = [];
    setSwiping(false);
    clearTrail();
  }, [clearTrail]);

  const commitSwipe = useCallback(() => {
    swipingRef.current = false;
    setSwiping(false);
    const path = swipePathRef.current;
    swipePathRef.current = [];
    clearTrail();
    if (!swiper) return;
    const candidates = swiper.decode(path, keysRef.current, suggestionCount);
    if (candidates.length === 0) return; // too short / no match — leave text untouched
    const [best, ...rest] = candidates;
    // swipeBaseRef was snapshotted at swipe start; insert the best word after it.
    onChange(swipeBaseRef.current + best.word + " ");
    engine.learn(best.word);
    setSwipeAltIndex(0);
    // Keep the just-swiped state active even for a unique match so a back-swipe
    // can delete the whole word; extra matches (if any) are cycle targets.
    setSwipeAlternatives([best.word, ...rest.map((c) => c.word)]);
  }, [clearTrail, engine, onChange, suggestionCount, swiper]);

  // ---- selection ----
  const selectHovered = useCallback(() => {
    revertValueRef.current = null;
    const el = hoverRef.current;
    if (!el) return;
    flash(el);
    const kind = el.dataset.kind ?? "char";
    const val = el.dataset.value ?? "";
    if (menuRef.current) {
      // Only the predictive word + recenter menus use head-aim selection; the
      // directional/settings menus are swipe-driven (see handleGesture).
      if (kind === "swipe-word") pickAlternative(val);
      else if (kind === "word") acceptWord(val);
      else if (kind === "recenter") pointer.calibrate();
      closeMenu();
      return;
    }
    if (kind === "char") {
      revertValueRef.current = valueRef.current; // snapshot so an Enter→hold combo can undo this
      insertChar(val);
    } else if (kind === "done") {
      onSubmit?.(valueRef.current);
    } else if (kind === "cancel") {
      onCancel?.();
    }
  }, [acceptWord, closeMenu, flash, insertChar, onCancel, onSubmit, pickAlternative, pointer]);

  const handleGesture = useCallback(
    (gesture: MrbdKeyboardGesture) => {
      // ---- mid-swipe: only back / another hold cancels; Enter commits (in keydown) ----
      if (swipingRef.current) {
        if (gesture === "back" || gesture === "hold") cancelSwipe();
        return;
      }

      const menu = menuRef.current;

      // ---- swipe-driven directional command menu (opened by pinch-and-hold) ----
      if (menu === "directions") {
        switch (gesture) {
          case "space": // swipe right -> Enter / submit
            onSubmit?.(valueRef.current);
            break;
          case "word-menu": // swipe down -> recalibrate the neutral pose
            pointer.calibrate();
            closeMenu();
            break;
          case "recenter-menu": // swipe up -> keyboard settings (reserved)
            setMenuKind("settings");
            break;
          case "back": // back gesture -> close the whole keyboard
            onCancel?.();
            break;
          case "delete": // swipe left -> back out of the menu
          case "hold": // another hold -> dismiss the menu
            closeMenu();
            break;
          default:
            break; // ignore select / aim inside the directional menu
        }
        return;
      }

      // ---- settings menu (placeholder for specialized actions) ----
      if (menu === "settings") {
        if (gesture === "delete") setMenuKind("directions"); // swipe left -> back to directions
        else if (gesture === "hold" || gesture === "back") closeMenu();
        return;
      }

      // ---- aim-driven menus (predictive words / recenter) ----
      if (menu === "word" || menu === "recenter") {
        if (gesture === "select") {
          selectHovered();
          return;
        }
        if (gesture === "recenter-menu" || gesture === "hold" || gesture === "back") closeMenu();
        return;
      }

      // ---- just-swiped: left/right step through the matches in place ----
      // A space is already inserted after the word, so right cycles matches
      // instead of adding a redundant space; left steps back, and a left at the
      // best match deletes the whole word. Any other action dismisses.
      if (swipeAltsRef.current.length) {
        if (gesture === "space") {
          stepAlternative(1);
          return;
        }
        if (gesture === "delete") {
          stepAlternative(-1);
          return;
        }
      }

      // ---- normal typing ----
      if (gesture === "select") {
        selectHovered();
        return;
      }
      if (gesture === "space") insertChar(" ");
      else if (gesture === "delete") backspace();
      else if (gesture === "word-menu") openMenu("word");
      else if (gesture === "recenter-menu") openMenu("recenter");
      else if (gesture === "hold") {
        // An Enter→hold combo (pinch then pinch-and-hold within the window) opens
        // the command menu; a *bare* hold starts a swipe word.
        if (performance.now() - lastSelectAtRef.current <= HOLD_COMBO_WINDOW) {
          if (revertValueRef.current != null) {
            onChange(revertValueRef.current); // undo the char the preceding Enter typed
            revertValueRef.current = null;
          }
          openMenu("directions");
        } else {
          startSwipe();
        }
      } else if (gesture === "back") onCancel?.();
    },
    [
      backspace,
      cancelSwipe,
      closeMenu,
      stepAlternative,
      insertChar,
      onCancel,
      onChange,
      onSubmit,
      openMenu,
      pointer,
      selectHovered,
      startSwipe,
    ],
  );

  // ---- key + click capture (owns input while mounted) ----
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onKeyDown = (e: KeyboardEvent) => {
      const gesture = gestureForKey(e);
      if (!gesture) return;
      if (phaseRef.current !== "type") return; // let the calibrate button handle Enter
      e.preventDefault();
      e.stopPropagation();
      const now = performance.now();
      if (gesture === "select") {
        lastEnterRef.current = now;
        lastSelectAtRef.current = now; // mark the pinch for Enter→hold combo detection
        if ("repeat" in e && e.repeat) return;
        if (now - lastArrowRef.current < ARROW_ENTER_GUARD) return;
        // A pinch while swiping commits the swiped word instead of typing a key.
        if (swipingRef.current) {
          commitSwipe();
          return;
        }
        selectHovered();
        return;
      }
      lastArrowRef.current = now;
      handleGesture(gesture);
    };

    const onClick = () => {
      if (phaseRef.current !== "type") return;
      const now = performance.now();
      if (now - lastArrowRef.current < ARROW_ENTER_GUARD) return;
      if (now - lastEnterRef.current < ENTER_CLICK_WINDOW) return;
      if (swipingRef.current) {
        commitSwipe();
        return;
      }
      selectHovered();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("click", onClick, true);
    };
  }, [commitSwipe, handleGesture, selectHovered]);

  // ---- sensor lifecycle ----
  useEffect(() => {
    void pointer.start();
    return () => pointer.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- rAF cursor loop ----
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      if (phaseRef.current === "type" && pointer.isCalibrated()) {
        const c = pointer.read();
        const reticle = reticleRef.current;
        if (reticle) {
          reticle.style.left = `${c.x}px`;
          reticle.style.top = `${c.y}px`;
        }

        if (swipingRef.current) {
          // Record the trace (decimated so the path stays small) and draw it.
          const path = swipePathRef.current;
          const last = path[path.length - 1];
          if (!last || Math.hypot(c.x - last.x, c.y - last.y) >= 4) {
            path.push({ x: c.x, y: c.y });
            trailRef.current?.setAttribute(
              "points",
              path.map((p) => `${p.x},${p.y}`).join(" "),
            );
          }
        }

        let best: HTMLElement | null = null;
        let bestD = Infinity;
        for (const t of centersRef.current) {
          const dx = t.cx - c.x;
          const dy = t.cy - c.y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = t.el;
          }
        }
        setHover(Math.sqrt(bestD) <= HOVER_MAX_DIST ? best : null);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pointer, setHover]);

  // ---- resize remeasure ----
  useEffect(() => {
    const onResize = () => {
      const area = areaRef.current;
      if (area) pointer.configure({ width: area.clientWidth, height: area.clientHeight });
      measure(menuRef.current ? "menu" : "type");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure, pointer]);

  useEffect(() => {
    startBtnRef.current?.focus();
  }, []);

  const begin = useCallback(() => {
    const area = areaRef.current;
    if (area) pointer.configure({ width: area.clientWidth, height: area.clientHeight });
    if (pointer.calibrate()) {
      setPhase("type");
      requestAnimationFrame(() => measure("type"));
    }
  }, [measure, pointer]);

  // ---- render ----
  const cw = currentWord(value);
  const head = cw ? value.slice(0, value.length - cw.length) : value;
  // After a swipe, the bar/word-menu show the alternative matches (top one is
  // already inserted) so the wearer can correct it; otherwise normal completions.
  const showingAlternatives = swipeAlternatives.length > 0;
  const barWords = showingAlternatives ? swipeAlternatives : suggestions;

  return (
    <div className="mrbd-kb">
      <div className="mrbd-kb-output">
        {value.length === 0 ? (
          <span className="ph">{title ?? "Look at a key, click to type"}</span>
        ) : (
          <>
            {head}
            <span className="cur">{cw}</span>
          </>
        )}
        <span className="caret">|</span>
      </div>

      <div className="mrbd-kb-suggest">
        {Array.from({ length: suggestionCount }).map((_, i) => {
          const word = barWords[i];
          const selected = showingAlternatives && i === swipeAltIndex;
          const cls = showingAlternatives
            ? `mrbd-kb-sug alt${selected ? " top" : ""}`
            : "mrbd-kb-sug";
          return word ? (
            <div className={cls} key={i}>
              <span className="rank">{selected ? "✓" : i + 1}</span>
              {word}
            </div>
          ) : (
            <div className="mrbd-kb-sug empty" key={i}>
              ·
            </div>
          );
        })}
      </div>

      <div className="mrbd-kb-area" ref={areaRef}>
        <div className="mrbd-kb-corner cancel" data-kbtarget data-scope="type" data-kind="cancel">
          ✕
        </div>
        <div className="mrbd-kb-corner done" data-kbtarget data-scope="type" data-kind="done">
          ✓
        </div>

        <div className="mrbd-kb-rows">
          {layout.rows.map((row, ri) => (
            <div className="mrbd-kb-row" key={ri}>
              {row.map((key, ki) => (
                <div
                  className="mrbd-kb-key mrbd-kb-target"
                  key={ki}
                  data-kbtarget
                  data-scope="type"
                  data-kind="char"
                  data-value={key.value}
                >
                  {key.label}
                </div>
              ))}
            </div>
          ))}
        </div>

        {(menuKind === "word" || menuKind === "recenter") && (
          <div className="mrbd-kb-menu">
            <h2>{menuKind === "word" ? (showingAlternatives ? "Fix swipe word" : "Pick a word") : "Re-center"}</h2>
            <div className="opts">
              {menuKind === "word"
                ? (showingAlternatives ? swipeAlternatives : suggestions).map((word, i) => (
                    <div
                      className="mrbd-kb-opt mrbd-kb-target"
                      key={i}
                      data-kbtarget
                      data-scope="menu"
                      data-kind={showingAlternatives ? "swipe-word" : "word"}
                      data-value={word}
                    >
                      {word}
                    </div>
                  ))
                : (
                    <div
                      className="mrbd-kb-opt mrbd-kb-target"
                      data-kbtarget
                      data-scope="menu"
                      data-kind="recenter"
                      data-value="recenter"
                    >
                      ↻ Recenter
                    </div>
                  )}
            </div>
            <div className="hint">aim + click to pick · swipe up / hold to cancel</div>
          </div>
        )}

        {menuKind === "directions" && (
          <div className="mrbd-kb-dirmenu">
            <div className="mrbd-kb-dir up">
              <span className="ar">↑</span>
              <span className="lbl">Settings</span>
              <span className="sub">layout · smoothing</span>
            </div>
            <div className="mrbd-kb-dir-row">
              <div className="mrbd-kb-dir left">
                <span className="ar">←</span>
                <span className="lbl">Cancel</span>
              </div>
              <div className="mrbd-kb-dir-hub">SWIPE</div>
              <div className="mrbd-kb-dir right">
                <span className="ar">→</span>
                <span className="lbl">Enter</span>
              </div>
            </div>
            <div className="mrbd-kb-dir down">
              <span className="ar">↓</span>
              <span className="lbl">Recalibrate</span>
            </div>
            <div className="mrbd-kb-dir-foot">back = close keyboard · hold = dismiss</div>
          </div>
        )}

        {menuKind === "settings" && (
          <div className="mrbd-kb-menu">
            <h2>Keyboard Settings</h2>
            <div className="mrbd-kb-settings">
              <div className="srow">
                Layout <span>QWERTY · Numpad (soon)</span>
              </div>
              <div className="srow">
                Smoothing <span>(soon)</span>
              </div>
            </div>
            <div className="hint">reserved · swipe left = back · back / hold = close</div>
          </div>
        )}

        <svg className="mrbd-kb-trail" style={{ display: swiping ? "block" : "none" }}>
          <polyline ref={trailRef} points="" />
        </svg>

        {swiping && <div className="mrbd-kb-swipebadge">SWIPING · PINCH TO FINISH</div>}

        <div
          className={`mrbd-kb-reticle${swiping ? " swiping" : ""}`}
          ref={reticleRef}
          style={{
            display:
              phase === "type" && menuKind !== "directions" && menuKind !== "settings" ? "block" : "none",
          }}
        />

        {phase === "calibrate" && (
          <div className="mrbd-kb-overlay">
            <h1>{title ?? "Head Keyboard"}</h1>
            <p>
              Look straight at the center, hold still, then <b>pinch</b> to calibrate. Move your head to aim; click
              to type. <b>Pinch &amp; hold</b> starts a swipe word — glide across the letters, then <b>pinch</b> to
              finish. Swipe right = space, left = delete, down = words, up = re-center.
            </p>
            <button ref={startBtnRef} className="mrbd-kb-start" onClick={begin}>
              CALIBRATE &amp; START
            </button>
          </div>
        )}
      </div>

      <div className="mrbd-kb-footer">
        {swiping ? (
          <>
            <b>Swiping</b> — glide across the letters, then <b>pinch</b> to finish · hold / back to cancel
          </>
        ) : showingAlternatives ? (
          <>
            <b>Swiped</b> · → next match · ← back / delete word · ↓ menu · keep typing to keep
          </>
        ) : (
          <>
            <b>Head</b> aims · <b>click</b> types · <b>hold</b> swipe word · <b>click+hold</b> menu · → space · ← delete · ↓ words · ✓ done
          </>
        )}
      </div>
    </div>
  );
}
