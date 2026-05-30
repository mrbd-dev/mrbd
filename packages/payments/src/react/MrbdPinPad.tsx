import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type MrbdPinPadProps = {
  /** Number of digits to collect before auto-submitting. Defaults to 4. */
  length?: number;
  /** Called with the full PIN once `length` digits are entered. */
  onSubmit: (pin: string) => void;
  /** Disable input (e.g. while a purchase is processing). */
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "del"] as const;
const COLUMNS = 3;

/**
 * A 600x600-friendly, D-pad / keyboard navigable numeric pad for entering a
 * purchase PIN on the glasses. Mirrors the auth OTP numpad. Auto-submits once
 * `length` digits are entered, then clears so it can be reused.
 */
export function MrbdPinPad({ length = 4, onSubmit, disabled = false, className, style }: MrbdPinPadProps) {
  const [pin, setPin] = useState("");
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (pin.length === length) {
      onSubmit(pin);
      setPin("");
    }
  }, [pin, length, onSubmit]);

  const press = useCallback(
    (key: (typeof KEYS)[number]) => {
      if (disabled) return;
      setPin((current) => {
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

  // Arrow keys move focus a whole row at a time, intercepting in the capture
  // phase so we run before the app-level linear D-pad handler.
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

      const current = buttonsRef.current.indexOf(document.activeElement as HTMLButtonElement);
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
      <div aria-live="polite" style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        {Array.from({ length }).map((_, index) => (
          <span
            key={index}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "2px solid #2a2d31",
              background: pin[index] ? "#ffffff" : "#1C1E21",
            }}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`, gap: 12 }}>
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
    minHeight: 80,
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
