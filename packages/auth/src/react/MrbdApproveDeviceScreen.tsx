import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import { useMrbdApproveDevice } from "./hooks.js";
import { useMrbdAuthStyles, type MrbdAuthTheme } from "./theme.js";

export type MrbdApproveDeviceScreenProps = {
  /** Called after the other device's pairing has been approved. */
  onApproved?: () => void;
  /** Replace the default heading. */
  title?: ReactNode;
  /** Number of characters in the code to approve. Defaults to 6. */
  codeLength?: number;
  /** Override design tokens for this screen (merged over the active theme). */
  theme?: Partial<MrbdAuthTheme>;
  className?: string;
  style?: CSSProperties;
};

/**
 * Approve another device's sign-in from this already-signed-in device.
 *
 * The user types the short code shown on the other device (e.g. the glasses);
 * this calls `approveDevice`, and the other device then receives its own session
 * without entering an OTP. Render this inside an `MrbdAuthProvider` on a surface
 * that is already signed in.
 *
 * Need a different layout entirely? Build your own UI on {@link useMrbdApproveDevice}.
 */
export function MrbdApproveDeviceScreen({
  onApproved,
  title,
  codeLength = 6,
  theme,
  className,
  style,
}: MrbdApproveDeviceScreenProps) {
  const { styles } = useMrbdAuthStyles(theme);
  const { phase, canApprove, error, approve } = useMrbdApproveDevice({ onApproved });
  const [code, setCode] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void approve(code);
  };

  if (!canApprove) {
    return (
      <div className={className} style={{ ...styles.container, ...style }}>
        <p style={styles.hint}>Sign in on this device first.</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...styles.container, ...style }}>
      <h1 style={styles.heading}>{title ?? "Approve device"}</h1>

      {(phase === "idle" || phase === "approving" || phase === "error") && (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={styles.hint}>Enter the code shown on the other device.</p>
          <input
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            onPaste={(event) => {
              event.preventDefault();
              setCode(event.clipboardData.getData("text").toUpperCase().replace(/\s/g, ""));
            }}
            placeholder="ABC-123"
            className="mrbd-focusable"
            style={{ ...styles.input, letterSpacing: "0.1em", textTransform: "uppercase" }}
            aria-label="Device code"
            disabled={phase === "approving"}
          />
          <button
            type="submit"
            className="mrbd-focusable"
            style={styles.primaryButton}
            disabled={phase === "approving"}
          >
            {phase === "approving" ? "Approving…" : "Approve"}
          </button>
          {error && (
            <p style={styles.error} role="alert">
              {error}
            </p>
          )}
        </form>
      )}

      {phase === "done" && <p style={styles.hint}>Approved. The other device is signing in.</p>}
    </div>
  );
}
