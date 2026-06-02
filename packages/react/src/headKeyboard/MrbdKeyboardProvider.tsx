import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import type { MrbdHeadPointerConfig } from "./headPointer.js";
import { MrbdHeadKeyboard } from "./MrbdHeadKeyboard.js";
import {
  MrbdKeyboardContext,
  type MrbdKeyboardContextValue,
  type MrbdTextInputRequest,
} from "./MrbdKeyboardContext.js";
import type { MrbdKeyboardLayout } from "./layout.js";
import type { MrbdPredictionEngine } from "./prediction.js";

export type MrbdKeyboardProviderProps = {
  children: ReactNode;
  /** Shared prediction engine (so learned words persist across opens). */
  prediction?: MrbdPredictionEngine;
  /** Default keyboard layout. */
  layout?: MrbdKeyboardLayout;
  /** Default head-pointer tuning. */
  config?: MrbdHeadPointerConfig;
};

type ActiveRequest = {
  title?: string;
  resolve: (value: string | null) => void;
};

/**
 * Provides an imperative `requestText()` that opens a temporary head-driven
 * keyboard overlay on top of the current view and resolves with the typed text.
 */
export function MrbdKeyboardProvider({
  children,
  prediction,
  layout,
  config,
}: MrbdKeyboardProviderProps) {
  const [request, setRequest] = useState<ActiveRequest | null>(null);
  const [value, setValue] = useState("");
  const requestRef = useRef<ActiveRequest | null>(null);
  requestRef.current = request;

  const finish = useCallback((result: string | null) => {
    requestRef.current?.resolve(result);
    requestRef.current = null;
    setRequest(null);
    setValue("");
  }, []);

  const requestText = useCallback(
    (req: MrbdTextInputRequest = {}) =>
      new Promise<string | null>((resolve) => {
        // If something is already open, cancel it first.
        requestRef.current?.resolve(null);
        setValue(req.initialValue ?? "");
        setRequest({ title: req.title, resolve });
      }),
    [],
  );

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
            onChange={setValue}
            onSubmit={(v) => finish(v)}
            onCancel={() => finish(null)}
            title={request.title}
            layout={layout}
            prediction={prediction}
            config={config}
          />
        </div>
      )}
    </MrbdKeyboardContext.Provider>
  );
}
