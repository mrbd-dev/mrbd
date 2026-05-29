import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { MrbdAuthError } from "../error.js";
import type { MrbdAuthRequest, MrbdSession } from "../types.js";
import { useMrbdAuth } from "./context.js";
import { MrbdOtpNumpad } from "./MrbdOtpNumpad.js";

type Phase = "starting" | "await_email" | "sending_otp" | "otp" | "verifying" | "done" | "error";

export type MrbdSignInScreenProps = {
  /** Called once the glasses receive their own session. */
  onSignedIn?: (session: MrbdSession) => void;
  /** Number of OTP digits to collect. Defaults to 6. */
  otpLength?: number;
  /** Replace the default heading. */
  title?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Drop-in glasses sign-in UI. It starts the device-pairing flow, shows the
 * verification URL + code for the user to enter on their phone at mrbd.link,
 * then collects the email OTP on a D-pad-navigable numpad and exchanges it for
 * a glasses-owned session.
 */
export function MrbdSignInScreen({ onSignedIn, otpLength = 6, title, className, style }: MrbdSignInScreenProps) {
  const { client } = useMrbdAuth();
  const [phase, setPhase] = useState<Phase>("starting");
  const [request, setRequest] = useState<MrbdAuthRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const start = useCallback(async () => {
    setError(null);
    setRequest(null);
    setPhase("starting");

    try {
      const req = await client.startSignIn({
        onEvent: (event) => {
          if (event.type === "email_submitted") {
            setPhase("sending_otp");
            client
              .sendOtp(event.email)
              .then(() => setPhase("otp"))
              .catch((sendError) => {
                setError(messageFrom(sendError));
                setPhase("error");
              });
          } else if (event.type === "expired") {
            setError("This sign-in request expired. Start again.");
            setPhase("error");
          } else if (event.type === "error") {
            setError(event.message);
            setPhase("error");
          }
        },
      });
      setRequest(req);
      setPhase((current) => (current === "starting" ? "await_email" : current));
    } catch (startError) {
      setError(messageFrom(startError));
      setPhase("error");
    }
  }, [client]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
    return () => {
      client.close();
    };
  }, [start, client]);

  const submitOtp = useCallback(
    async (token: string) => {
      setPhase("verifying");
      try {
        const session = await client.verifyOtp(token);
        setPhase("done");
        onSignedIn?.(session);
      } catch (verifyError) {
        setError(messageFrom(verifyError));
        setPhase("otp");
      }
    },
    [client, onSignedIn],
  );

  const restart = useCallback(() => {
    startedRef.current = true;
    void start();
  }, [start]);

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={labelStyle}>MRBD Sign in</p>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}>
          {title ?? "Sign in to continue"}
        </h1>
      </header>

      {(phase === "starting" || phase === "sending_otp") && <p style={hintStyle}>Preparing a secure sign-in…</p>}

      {phase === "await_email" && request && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={hintStyle}>On your phone, open</p>
          <p style={urlStyle}>{displayUrl(request.verificationUrl)}</p>
          <p style={hintStyle}>and enter this code:</p>
          <p style={codeStyle}>{formatUserCode(request.userCode)}</p>
          <p style={subtleStyle}>Then type your email on your phone. The rest happens here.</p>
        </div>
      )}

      {phase === "otp" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={hintStyle}>Enter the {otpLength}-digit code we emailed you.</p>
          <MrbdOtpNumpad length={otpLength} onSubmit={submitOtp} />
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
const urlStyle: CSSProperties = { margin: 0, fontSize: 24, fontWeight: 800, color: "#ffffff" };

const codeStyle: CSSProperties = {
  margin: 0,
  fontSize: 44,
  fontWeight: 900,
  letterSpacing: "0.18em",
  color: "#a3e635",
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
