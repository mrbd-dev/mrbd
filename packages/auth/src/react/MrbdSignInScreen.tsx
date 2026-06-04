import { type CSSProperties, type ReactNode } from "react";

import type { MrbdSession } from "../types.js";
import { useMrbdDeviceSignIn } from "./hooks.js";
import { MrbdOtpNumpad } from "./MrbdOtpNumpad.js";
import { useMrbdAuthStyles, type MrbdAuthTheme } from "./theme.js";

export type MrbdSignInScreenProps = {
  /** Called once the glasses receive their own session. */
  onSignedIn?: (session: MrbdSession) => void;
  /** Number of OTP digits to collect. Defaults to 6. */
  otpLength?: number;
  /** Replace the default heading. */
  title?: ReactNode;
  /** Override design tokens for this screen (merged over the active theme). */
  theme?: Partial<MrbdAuthTheme>;
  className?: string;
  style?: CSSProperties;
};

/**
 * Drop-in glasses sign-in UI. It starts the device-pairing flow, shows the
 * verification URL + code for the user to enter on their phone at mrbd.link,
 * then collects the email OTP on a D-pad-navigable numpad and exchanges it for
 * a glasses-owned session.
 *
 * Need a different layout entirely? Build your own UI on {@link useMrbdDeviceSignIn}.
 */
export function MrbdSignInScreen({
  onSignedIn,
  otpLength = 6,
  title,
  theme,
  className,
  style,
}: MrbdSignInScreenProps) {
  const { styles } = useMrbdAuthStyles(theme);
  const { phase, request, error, start, verifyOtp } = useMrbdDeviceSignIn({ onSignedIn });

  return (
    <div className={className} style={{ ...styles.container, ...style }}>
      <h1 style={styles.heading}>{title ?? "Sign in"}</h1>

      {(phase === "starting" || phase === "sending_otp") && (
        <p style={styles.hint}>Preparing sign-in…</p>
      )}

      {phase === "await_email" && request && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={styles.hint}>On your phone, open</p>
          <p style={styles.url}>{displayUrl(request.verificationUrl)}</p>
          <p style={styles.hint}>Code</p>
          <p style={styles.code}>{formatUserCode(request.userCode)}</p>
          <p style={styles.subtle}>Enter your email on your phone, then enter the code here.</p>
        </div>
      )}

      {phase === "otp" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={styles.hint}>Enter the {otpLength}-digit code from your email.</p>
          <MrbdOtpNumpad length={otpLength} onSubmit={(token) => void verifyOtp(token)} theme={theme} />
        </div>
      )}

      {phase === "verifying" && <p style={styles.hint}>Verifying…</p>}

      {phase === "done" && <p style={styles.hint}>Signed in.</p>}

      {phase === "error" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ ...styles.hint, color: styles.error.color }} role="alert">
            {error ?? "Something went wrong."}
          </p>
          <button type="button" className="mrbd-focusable" onClick={() => void start()} style={styles.retryButton}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

/** Group the code into dash-separated chunks of 3, matching mrbd.link (e.g. "A1B-2C3"). */
function formatUserCode(code: string): string {
  return code.replace(/(.{3})(?=.)/g, "$1-");
}
