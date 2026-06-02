import { MRBD_VIEWPORT_SIZE } from "@mrbd/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MrbdHeadPointerConfig } from "./headPointer.js";
import { gestureForKey, type MrbdKeyboardGesture } from "./input.js";
import { MRBD_DEFAULT_KEYBOARD_LAYOUT, type MrbdKeyboardLayout } from "./layout.js";
import { createMrbdPredictionEngine, type MrbdPredictionEngine } from "./prediction.js";
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
};

const ARROW_ENTER_GUARD = 240; // ignore an Enter that piggybacks a swipe
const ENTER_CLICK_WINDOW = 1200; // a pinch fires Enter + click; ignore the trailing click
const HOVER_MAX_DIST = 70;

type MenuKind = "word" | "recenter" | null;

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
.mrbd-kb-reticle { position: absolute; width: 24px; height: 24px; margin-left: -12px; margin-top: -12px; border: 2px solid #fff; border-radius: 50%; pointer-events: none; z-index: 30; box-shadow: 0 0 12px rgba(255,255,255,0.7); }
.mrbd-kb-reticle::after { content: ""; position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; margin: -2px 0 0 -2px; background: #00d4ff; border-radius: 50%; }
.mrbd-kb-menu { position: absolute; inset: 0; background: rgba(0,0,0,0.82); z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; }
.mrbd-kb-menu h2 { margin: 0; font-size: 16px; color: #00d4ff; letter-spacing: 1px; }
.mrbd-kb-menu .opts { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: center; }
.mrbd-kb-opt { min-width: 120px; height: 60px; padding: 0 18px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: #fff; background: #1c1e21; border: 2px solid transparent; border-radius: 12px; }
.mrbd-kb-menu .hint { font-size: 12px; color: #6b6f76; }
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
}: MrbdHeadKeyboardProps) {
  useInjectedStyle();

  const engine = useMemo<MrbdPredictionEngine>(
    () => prediction ?? createMrbdPredictionEngine(),
    [prediction],
  );
  const pointer = useMrbdHeadPointer(config);

  const [phase, setPhase] = useState<"calibrate" | "type">("calibrate");
  const [menuKind, setMenuKind] = useState<MenuKind>(null);

  const areaRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const centersRef = useRef<Center[]>([]);
  const hoverRef = useRef<HTMLElement | null>(null);
  const lastArrowRef = useRef(0);
  const lastEnterRef = useRef(0);

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
    centersRef.current = Array.from(nodes).map((el) => {
      const box = el.getBoundingClientRect();
      return {
        el,
        cx: box.left - rect.left + box.width / 2,
        cy: box.top - rect.top + box.height / 2,
        kind: el.dataset.kind ?? "char",
        value: el.dataset.value ?? "",
      };
    });
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

  // ---- text ops ----
  const insertChar = useCallback((ch: string) => onChange(valueRef.current + ch), [onChange]);
  const backspace = useCallback(() => onChange(valueRef.current.slice(0, -1)), [onChange]);
  const acceptWord = useCallback(
    (word: string) => {
      const v = valueRef.current;
      const cw = currentWord(v);
      const head = cw ? v.slice(0, v.length - cw.length) : v;
      onChange(head + word + " ");
      engine.learn(word);
    },
    [engine, onChange],
  );

  // ---- menus ----
  const openMenu = useCallback(
    (kind: Exclude<MenuKind, null>) => {
      if (kind === "word" && suggestionsRef.current.length === 0) return;
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

  // ---- selection ----
  const selectHovered = useCallback(() => {
    const el = hoverRef.current;
    if (!el) return;
    flash(el);
    const kind = el.dataset.kind ?? "char";
    const val = el.dataset.value ?? "";
    if (menuRef.current) {
      if (kind === "word") acceptWord(val);
      else if (kind === "recenter") pointer.calibrate();
      closeMenu();
      return;
    }
    if (kind === "char") insertChar(val);
    else if (kind === "done") onSubmit?.(valueRef.current);
    else if (kind === "cancel") onCancel?.();
  }, [acceptWord, closeMenu, flash, insertChar, onCancel, onSubmit, pointer]);

  const handleGesture = useCallback(
    (gesture: MrbdKeyboardGesture) => {
      if (gesture === "select") {
        selectHovered();
        return;
      }
      if (menuRef.current) {
        // inside a menu only "back"/recenter-swipe-up closes; head-aim selects
        if (gesture === "recenter-menu" || gesture === "back") closeMenu();
        return;
      }
      if (gesture === "space") insertChar(" ");
      else if (gesture === "delete") backspace();
      else if (gesture === "word-menu") openMenu("word");
      else if (gesture === "recenter-menu") openMenu("recenter");
      else if (gesture === "back") onCancel?.();
    },
    [backspace, closeMenu, insertChar, onCancel, openMenu, selectHovered],
  );

  // ---- key + click capture (owns input while mounted) ----
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onKeyDown = (e: KeyboardEvent) => {
      const gesture = gestureForKey(e.key);
      if (!gesture) return;
      if (phaseRef.current !== "type") return; // let the calibrate button handle Enter
      e.preventDefault();
      e.stopPropagation();
      const now = performance.now();
      if (gesture === "select") {
        lastEnterRef.current = now;
        if ("repeat" in e && e.repeat) return;
        if (now - lastArrowRef.current < ARROW_ENTER_GUARD) return;
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
      selectHovered();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("click", onClick, true);
    };
  }, [handleGesture, selectHovered]);

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
          const word = suggestions[i];
          return word ? (
            <div className="mrbd-kb-sug" key={i}>
              <span className="rank">{i + 1}</span>
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

        {menuKind && (
          <div className="mrbd-kb-menu">
            <h2>{menuKind === "word" ? "Pick a word" : "Re-center"}</h2>
            <div className="opts">
              {menuKind === "word"
                ? suggestions.map((word, i) => (
                    <div
                      className="mrbd-kb-opt mrbd-kb-target"
                      key={i}
                      data-kbtarget
                      data-scope="menu"
                      data-kind="word"
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
            <div className="hint">aim + click to pick · swipe up to cancel</div>
          </div>
        )}

        <div className="mrbd-kb-reticle" ref={reticleRef} style={{ display: phase === "type" ? "block" : "none" }} />

        {phase === "calibrate" && (
          <div className="mrbd-kb-overlay">
            <h1>{title ?? "Head Keyboard"}</h1>
            <p>
              Look straight at the center, hold still, then <b>pinch</b> to calibrate. Move your head to aim; click
              to type. Swipe right = space, left = delete, down = words, up = re-center.
            </p>
            <button ref={startBtnRef} className="mrbd-kb-start" onClick={begin}>
              CALIBRATE &amp; START
            </button>
          </div>
        )}
      </div>

      <div className="mrbd-kb-footer">
        <b>Head</b> aims · <b>click</b> types · → space · ← delete · ↓ words · ↑ recenter · ✓ done · ✕ cancel
      </div>
    </div>
  );
}
