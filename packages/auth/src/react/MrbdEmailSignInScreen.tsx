import {
  useCallback,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

import { MrbdAuthError } from "../error.js";
import type { MrbdSession } from "../types.js";
import { useMrbdAuth } from "./context.js";
import { MrbdOtpNumpad } from "./MrbdOtpNumpad.js";

type Phase = "email" | "sending_otp" | "otp" | "verifying" | "done" | "error";

export type MrbdEmailSignInScreenProps = {
  /** Called once the surface receives its own session. */
  onSignedIn?: (session: MrbdSession) => void;
  /** Number of OTP digits to collect. Defaults to 6. */
  otpLength?: number;
  /** Replace the default heading. */
  title?: ReactNode;
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
 */
export function MrbdEmailSignInScreen({
  onSignedIn,
  otpLength = 6,
  title,
  className,
  style,
}: MrbdEmailSignInScreenProps) {
  const { client } = useMrbdAuth();
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitEmail = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const normalized = email.trim().toLowerCase();
      if (!normalized) {
        setError("Enter your email to continue.");
        return;
      }

      setError(null);
      setPhase("sending_otp");
      try {
        await client.sendEmailOtp(normalized);
        setEmail(normalized);
        setPhase("otp");
      } catch (sendError) {
        setError(messageFrom(sendError));
        setPhase("email");
      }
    },
    [client, email],
  );

  const submitOtp = useCallback(
    async (token: string) => {
      setPhase("verifying");
      try {
        const session = await client.verifyEmailOtp(token, email);
        setPhase("done");
        onSignedIn?.(session);
      } catch (verifyError) {
        setError(messageFrom(verifyError));
        setPhase("otp");
      }
    },
    [client, email, onSignedIn],
  );

  const restart = useCallback(() => {
    setError(null);
    setPhase("email");
  }, []);

  const resend = useCallback(async () => {
    setError(null);
    setPhase("sending_otp");
    try {
      await client.sendEmailOtp(email);
      setPhase("otp");
    } catch (sendError) {
      setError(messageFrom(sendError));
      setPhase("otp");
    }
  }, [client, email]);

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={labelStyle}>MRBD Sign in</p>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}>
          {title ?? "Sign in to continue"}
        </h1>
      </header>

      {phase === "email" && (
        <form onSubmit={submitEmail} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={hintStyle}>Enter your email and we'll send you a one-time code.</p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mrbd-focusable"
            style={inputStyle}
            aria-label="Email address"
          />
          <button type="submit" className="mrbd-focusable" style={primaryButtonStyle}>
            Send code
          </button>
        </form>
      )}

      {phase === "sending_otp" && <p style={hintStyle}>Sending your code…</p>}

      {phase === "otp" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={hintStyle}>
            Enter the {otpLength}-digit code we emailed to <strong>{email}</strong>.
          </p>
          <MrbdOtpNumpad length={otpLength} onSubmit={submitOtp} />
          <button type="button" className="mrbd-focusable" onClick={resend} style={subtleButtonStyle}>
            Resend code
          </button>
        </div>
      )}

      {phase === "verifying" && <p style={hintStyle}>Verifying your code…</p>}

      {phase === "done" && <p style={hintStyle}>You're signed in.</p>}

      {phase === "error" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ ...hintStyle, color: "#f87171" }} role="alert">
            {error ?? "Something went wrong."}
          </p>
          <button type="button" className="mrbd-focusable" onClick={restart} style={retryButtonStyle}>
            Try again
          </button>
        </div>
      )}

      {error && phase !== "error" && (
        <p style={{ ...subtleStyle, color: "#f87171" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function messageFrom(error: unknown): string {
  if (error instanceof MrbdAuthError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 24,
  color: "#ffffff",
  background: "#0a0a0f",
  borderRadius: 28,
};

const labelStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "#67e8f9",
};

const hintStyle: CSSProperties = { margin: 0, fontSize: 16, color: "#d4d4d8" };
const subtleStyle: CSSProperties = { margin: 0, fontSize: 13, color: "#9ca3af" };

const inputStyle: CSSProperties = {
  minHeight: 64,
  borderRadius: 18,
  border: "2px solid #2a2d31",
  background: "#1C1E21",
  color: "#ffffff",
  font: "inherit",
  fontSize: 20,
  fontWeight: 600,
  padding: "0 18px",
  outline: "none",
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 72,
  borderRadius: 24,
  border: "2px solid transparent",
  background: "#a3e635",
  color: "#0a0a0f",
  font: "inherit",
  fontWeight: 900,
  fontSize: 18,
  cursor: "pointer",
};

const subtleButtonStyle: CSSProperties = {
  minHeight: 56,
  borderRadius: 18,
  border: "2px solid transparent",
  background: "#1C1E21",
  color: "#9ca3af",
  font: "inherit",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};

const retryButtonStyle: CSSProperties = {
  minHeight: 88,
  borderRadius: 24,
  border: "2px solid transparent",
  background: "#1C1E21",
  color: "#ffffff",
  font: "inherit",
  fontWeight: 800,
  fontSize: 18,
  cursor: "pointer",
};
