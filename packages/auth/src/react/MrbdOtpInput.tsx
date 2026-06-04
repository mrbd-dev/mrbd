import { useCallback, useRef, useState, type CSSProperties } from "react";

import { parseOtpDigits } from "./otp.js";
import { useMrbdAuthStyles, type MrbdAuthTheme } from "./theme.js";

export type MrbdOtpInputProps = {
  /** Number of digits to collect before auto-submitting. Defaults to 6. */
  length?: number;
  /** Called with the full code once `length` digits are entered. */
  onSubmit: (code: string) => void;
  /** Disable input (e.g. while verifying). */
  disabled?: boolean;
  /** Focus the field on mount. Defaults to true. */
  autoFocus?: boolean;
  /** Override design tokens (merged over the active theme). */
  theme?: Partial<MrbdAuthTheme>;
  className?: string;
  style?: CSSProperties;
};

/**
 * Single-field OTP entry for keyboard surfaces (phone/desktop). Supports typing,
 * pasting a full code from SMS or email, and `autoComplete="one-time-code"`.
 */
export function MrbdOtpInput({
  length = 6,
  onSubmit,
  disabled = false,
  autoFocus = true,
  theme,
  className,
  style,
}: MrbdOtpInputProps) {
  const { styles } = useMrbdAuthStyles(theme);
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const applyDigits = useCallback(
    (raw: string) => {
      const next = parseOtpDigits(raw, length);
      setCode(next);
      if (next.length === length) {
        onSubmit(next);
        setCode("");
      }
    },
    [length, onSubmit],
  );

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      disabled={disabled}
      value={code}
      maxLength={length}
      onChange={(event) => applyDigits(event.target.value)}
      onPaste={(event) => {
        event.preventDefault();
        applyDigits(event.clipboardData.getData("text"));
      }}
      placeholder="000000".slice(0, length)
      className={className ? `mrbd-focusable ${className}` : "mrbd-focusable"}
      style={{
        ...styles.otpInput,
        ...style,
      }}
      aria-label="Verification code"
    />
  );
}
