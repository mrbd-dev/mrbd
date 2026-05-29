import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type MrbdOtpNumpadProps = {
  /** Number of digits to collect before auto-submitting. Defaults to 6. */
  length?: number;
  /** Called with the full code once `length` digits are entered. */
  onSubmit: (code: string) => void;
  /** Disable input (e.g. while verifying). */
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "del"] as const;
const COLUMNS = 3;

/**
 * A 600x600-friendly, D-pad / keyboard navigable numeric pad for entering an
 * email OTP on the glasses. Auto-submits once `length` digits are entered.
 */
export function MrbdOtpNumpad({ length = 6, onSubmit, disabled = false, className, style }: MrbdOtpNumpadProps) {
  const [code, setCode] = useState("");
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (code.length === length) {
      onSubmit(code);
      setCode("");
    }
  }, [code, length, onSubmit]);

  const press = useCallback(
    (key: (typeof KEYS)[number]) => {
      if (disabled) return;
      setCode((current) => {
        if (key === "clear") return "";
        if (key === "del") return current.slice(0, -1);
        if (current.length >= length) return current;
        return current + key;
      });
    },
    [disabled, length],
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
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 16, ...style }}>
      <div
        aria-live="polite"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {Array.from({ length }).map((_, index) => (
          <span
            key={index}
            style={{
              width: 40,
              height: 56,
              display: "grid",
              placeItems: "center",
              borderRadius: 12,
              border: "2px solid #2a2d31",
              background: "#1C1E21",
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            {code[index] ?? ""}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gap: 12,
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
            style={keyStyle(key)}
          >
            {key === "del" ? "⌫" : key === "clear" ? "✕" : key}
          </button>
        ))}
      </div>
    </div>
  );
}

function keyStyle(key: (typeof KEYS)[number]): CSSProperties {
  const accent = key === "del" || key === "clear";
  return {
    minHeight: 88,
    borderRadius: 24,
    border: "2px solid transparent",
    background: accent ? "#26282c" : "#1C1E21",
    color: accent ? "#9ca3af" : "#ffffff",
    font: "inherit",
    fontSize: 26,
    fontWeight: 800,
    cursor: "pointer",
    transition: "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
  };
}
