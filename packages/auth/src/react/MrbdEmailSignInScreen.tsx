import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import type { MrbdSession } from "../types.js";
import { useMrbdEmailSignIn } from "./hooks.js";
import { MrbdOtpInput } from "./MrbdOtpInput.js";
import { useMrbdAuthStyles, type MrbdAuthTheme } from "./theme.js";

export type MrbdEmailSignInScreenProps = {
  /** Called once the surface receives its own session. */
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
 * Direct email-OTP sign-in for keyboard surfaces (a phone or desktop web app).
 *
 * Unlike {@link MrbdSignInScreen} (the glasses device-pairing flow), this screen
 * assumes the surface has its own keyboard: the user types their email, receives
 * a one-time code by email, and enters it here. The resulting session is bound to
 * the same `appId` and Supabase user as the glasses, so a user who signs in here
 * shares one identity (and one set of managed data) across devices.
 *
 * Need a different layout entirely? Build your own UI on {@link useMrbdEmailSignIn}.
 */
export function MrbdEmailSignInScreen({
  onSignedIn,
  otpLength = 6,
  title,
  theme,
  className,
  style,
}: MrbdEmailSignInScreenProps) {
  const { styles } = useMrbdAuthStyles(theme);
  const { phase, email, error, sendOtp, verifyOtp, resend } = useMrbdEmailSignIn({ onSignedIn });
  const [draftEmail, setDraftEmail] = useState("");

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    void sendOtp(draftEmail);
  };

  return (
    <div className={className} style={{ ...styles.container, ...style }}>
      <h1 style={styles.heading}>{title ?? "Sign in"}</h1>

      {phase === "email" && (
        <form onSubmit={submitEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={styles.hint}>Email</p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={draftEmail}
            onChange={(event) => setDraftEmail(event.target.value)}
            placeholder="you@example.com"
            className="mrbd-focusable"
            style={styles.input}
            aria-label="Email address"
          />
          <button type="submit" className="mrbd-focusable" style={styles.primaryButton}>
            Send code
          </button>
        </form>
      )}

      {phase === "sending_otp" && <p style={styles.hint}>Sending code…</p>}

      {phase === "otp" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={styles.hint}>Code sent to {email}</p>
          <MrbdOtpInput
            length={otpLength}
            onSubmit={(token) => void verifyOtp(token)}
            theme={theme}
          />
          <button
            type="button"
            className="mrbd-focusable"
            onClick={() => void resend()}
            style={styles.subtleButton}
          >
            Resend code
          </button>
        </div>
      )}

      {phase === "verifying" && <p style={styles.hint}>Verifying…</p>}

      {phase === "done" && <p style={styles.hint}>Signed in.</p>}

      {error && (
        <p style={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
