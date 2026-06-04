import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { parseOtpDigits } from "./otp.js";
import { useMrbdAuthStyles, type MrbdAuthTheme } from "./theme.js";

export type MrbdOtpNumpadProps = {
  /** Number of digits to collect before auto-submitting. Defaults to 6. */
  length?: number;
  /** Called with the full code once `length` digits are entered. */
  onSubmit: (code: string) => void;
  /** Disable input (e.g. while verifying). */
  disabled?: boolean;
  /** Override design tokens for this numpad (merged over the active theme). */
  theme?: Partial<MrbdAuthTheme>;
  className?: string;
  style?: CSSProperties;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "del"] as const;
const COLUMNS = 3;

/**
 * A 600x600-friendly, D-pad / keyboard navigable numeric pad for entering an
 * email OTP on the glasses. Auto-submits once `length` digits are entered.
 * Also accepts pasted codes when a keyboard is available.
 */
export function MrbdOtpNumpad({
  length = 6,
  onSubmit,
  disabled = false,
  theme,
  className,
  style,
}: MrbdOtpNumpadProps) {
  const { styles } = useMrbdAuthStyles(theme);
  const [code, setCode] = useState("");
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const pasteInputRef = useRef<HTMLInputElement>(null);

  const applyDigits = useCallback(
    (raw: string) => {
      if (disabled) return;
      const next = parseOtpDigits(raw, length);
      if (next.length === length) {
        onSubmit(next);
        setCode("");
        return;
      }
      setCode(next);
    },
    [disabled, length, onSubmit],
  );

  const press = useCallback(
    (key: (typeof KEYS)[number]) => {
      if (disabled) return;
      setCode((current) => {
        let raw = current;
        if (key === "clear") raw = "";
        else if (key === "del") raw = current.slice(0, -1);
        else if (current.length < length) raw = current + key;
        else return current;
        const next = parseOtpDigits(raw, length);
        if (next.length === length) {
          onSubmit(next);
          return "";
        }
        return next;
      });
    },
    [disabled, length, onSubmit],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      if (/^[0-9]$/.test(event.key)) {
        press(event.key as (typeof KEYS)[number]);
      } else if (event.key === "Backspace") {
        press("del");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, press]);

  // The grid is laid out in rows of `COLUMNS`, so Up/Down should jump a whole
  // row instead of falling back to the app-level linear D-pad nav (which treats
  // every arrow as left/right). We intercept arrows in the capture phase so we
  // run before — and can suppress — the global D-pad handler that listens on
  // the document during the bubble phase.
  useEffect(() => {
    const deltas: Record<string, number> = {
      ArrowUp: -COLUMNS,
      ArrowDown: COLUMNS,
      ArrowLeft: -1,
      ArrowRight: 1,
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      const delta = deltas[event.key];
      if (delta === undefined) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const current = buttonsRef.current.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      if (current === -1) {
        buttonsRef.current[0]?.focus();
        return;
      }
      const next = current + delta;
      if (next < 0 || next >= KEYS.length) return;
      buttonsRef.current[next]?.focus();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [disabled]);

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 12, ...style }}>
      <div style={{ position: "relative" }}>
        <div
          aria-live="polite"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {Array.from({ length }).map((_, index) => (
            <span key={index} style={styles.otpBox(Boolean(code[index]))}>
              {code[index] ?? ""}
            </span>
          ))}
        </div>
        <input
          ref={pasteInputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          value={code}
          onChange={(event) => applyDigits(event.target.value)}
          onPaste={(event) => {
            event.preventDefault();
            applyDigits(event.clipboardData.getData("text"));
          }}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            width: "100%",
            height: "100%",
            border: "none",
            padding: 0,
            margin: 0,
            cursor: "text",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gap: 8,
        }}
      >
        {KEYS.map((key, index) => (
          <button
            key={key}
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            type="button"
            className="mrbd-focusable"
            disabled={disabled}
            onClick={() => press(key)}
            aria-label={key === "del" ? "Delete" : key === "clear" ? "Clear" : key}
            style={styles.key(key === "del" || key === "clear")}
          >
            {key === "del" ? "Del" : key === "clear" ? "Clr" : key}
          </button>
        ))}
      </div>
    </div>
  );
}
