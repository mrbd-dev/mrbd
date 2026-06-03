import { DPAD } from "@mrbd/core";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isMrbdEligibleField, openMrbdKeyboardForField } from "./fieldBinding.js";
import type { MrbdHeadPointerConfig } from "./headPointer.js";
import { MrbdHeadKeyboard } from "./MrbdHeadKeyboard.js";
import {
  MrbdKeyboardContext,
  type MrbdKeyboardContextValue,
  type MrbdTextInputRequest,
} from "./MrbdKeyboardContext.js";
import type { MrbdKeyboardLayout } from "./layout.js";
import type { MrbdPredictionEngine } from "./prediction.js";
import type { MrbdSwipeDecoder } from "./swipe.js";

export type MrbdKeyboardProviderProps = {
  children: ReactNode;
  /**
   * When true, native `<input>`, `<textarea>`, and `contenteditable` fields
   * automatically open the head keyboard when activated (D-pad `Enter`), iOS
   * keyboard style. Enable this only on the glasses; leave it off so phones and
   * computers use their own keyboard. Add `data-mrbd-keyboard="off"` to any
   * field (or ancestor) to opt out.
   */
  autoBind?: boolean;
  /** Shared prediction engine (so learned words persist across opens). */
  prediction?: MrbdPredictionEngine;
  /**
   * Swipe-to-type decoder shared across opens. Defaults to one built from the
   * prediction word list; pass `null` to disable swipe typing.
   */
  swipeDecoder?: MrbdSwipeDecoder | null;
  /** Default keyboard layout. */
  layout?: MrbdKeyboardLayout;
  /** Numeric layout used for `type="number" | "tel"` fields when auto-binding. */
  numericLayout?: MrbdKeyboardLayout;
  /** Default head-pointer tuning. */
  config?: MrbdHeadPointerConfig;
};

type ActiveRequest = {
  title?: string;
  layout?: MrbdKeyboardLayout;
  resolve: (value: string | null) => void;
};

/**
 * Provides an imperative `requestText()` that opens a temporary head-driven
 * keyboard overlay on top of the current view and resolves with the typed text.
 *
 * With `autoBind`, it also intercepts activation of native text fields and opens
 * the keyboard for them automatically — so existing `<input>`/`<textarea>` code
 * "just works" on the glasses with no per-field wiring.
 */
export function MrbdKeyboardProvider({
  children,
  autoBind = false,
  prediction,
  swipeDecoder,
  layout,
  numericLayout,
  config,
}: MrbdKeyboardProviderProps) {
  const [request, setRequest] = useState<ActiveRequest | null>(null);
  const [value, setValue] = useState("");
  const requestRef = useRef<ActiveRequest | null>(null);
  requestRef.current = request;
  const maxLengthRef = useRef<number | undefined>(undefined);

  const finish = useCallback((result: string | null) => {
    requestRef.current?.resolve(result);
    requestRef.current = null;
    maxLengthRef.current = undefined;
    setRequest(null);
    setValue("");
  }, []);

  const handleChange = useCallback((next: string) => {
    const max = maxLengthRef.current;
    setValue(max != null && max > 0 ? next.slice(0, max) : next);
  }, []);

  const requestText = useCallback(
    (req: MrbdTextInputRequest = {}) =>
      new Promise<string | null>((resolve) => {
        // If something is already open, cancel it first.
        requestRef.current?.resolve(null);
        maxLengthRef.current = req.maxLength;
        const initial = req.initialValue ?? "";
        setValue(
          req.maxLength != null && req.maxLength > 0 ? initial.slice(0, req.maxLength) : initial,
        );
        setRequest({ title: req.title, layout: req.layout, resolve });
      }),
    [],
  );

  const layouts = useMemo(
    () => ({ default: layout, numeric: numericLayout }),
    [layout, numericLayout],
  );

  // Auto-bind: open the keyboard when the wearer activates a native text field.
  useEffect(() => {
    if (!autoBind || typeof document === "undefined") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== DPAD.SELECT) return;
      if (requestRef.current) return; // keyboard already open — let it own input
      const active = document.activeElement;
      if (!isMrbdEligibleField(active)) return;
      // Take over before useDpadNavigation turns this into a no-op `.click()`.
      event.preventDefault();
      event.stopImmediatePropagation();
      void openMrbdKeyboardForField(active, requestText, layouts);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [autoBind, layouts, requestText]);

  const contextValue = useMemo<MrbdKeyboardContextValue>(
    () => ({ requestText, isOpen: request !== null }),
    [request, requestText],
  );

  return (
    <MrbdKeyboardContext.Provider value={contextValue}>
      {children}
      {request && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "#000",
            zIndex: 2147483000,
          }}
        >
          <MrbdHeadKeyboard
            value={value}
            onChange={handleChange}
            onSubmit={(v) => finish(v)}
            onCancel={() => finish(null)}
            title={request.title}
            layout={request.layout ?? layout}
            prediction={prediction}
            swipeDecoder={swipeDecoder}
            config={config}
          />
        </div>
      )}
    </MrbdKeyboardContext.Provider>
  );
}
