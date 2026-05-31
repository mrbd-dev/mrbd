import {
  useCallback,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

import { MrbdAuthError } from "../error.js";
import { useMrbdAuth } from "./context.js";

type Phase = "idle" | "approving" | "done" | "error";

export type MrbdApproveDeviceScreenProps = {
  /** Called after the other device's pairing has been approved. */
  onApproved?: () => void;
  /** Replace the default heading. */
  title?: ReactNode;
  /** Number of characters in the code to approve. Defaults to 6. */
  codeLength?: number;
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
 */
export function MrbdApproveDeviceScreen({
  onApproved,
  title,
  codeLength = 6,
  className,
  style,
}: MrbdApproveDeviceScreenProps) {
  const { client, status } = useMrbdAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const normalized = code.replace(/[\s-]/g, "").toUpperCase();
      if (normalized.length < codeLength) {
        setError(`Enter the ${codeLength}-character code shown on the other device.`);
        return;
      }

      setError(null);
      setPhase("approving");
      try {
        await client.approveDevice(normalized);
        setPhase("done");
        onApproved?.();
      } catch (approveError) {
        setError(messageFrom(approveError));
        setPhase("error");
      }
    },
    [client, code, codeLength, onApproved],
  );

  if (status !== "signed-in") {
    return (
      <div className={className} style={{ ...containerStyle, ...style }}>
        <p style={hintStyle}>Sign in on this device before approving another device.</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={labelStyle}>Approve a device</p>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}>
          {title ?? "Sign in your other device"}
        </h1>
      </header>

      {(phase === "idle" || phase === "approving" || phase === "error") && (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={hintStyle}>Enter the code shown on the device you want to sign in.</p>
          <input
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="ABC-123"
            className="mrbd-focusable"
            style={inputStyle}
            aria-label="Device code"
            disabled={phase === "approving"}
          />
          <button
            type="submit"
            className="mrbd-focusable"
            style={primaryButtonStyle}
            disabled={phase === "approving"}
          >
            {phase === "approving" ? "Approving…" : "Approve"}
          </button>
          {error && (
            <p style={{ ...subtleStyle, color: "#f87171" }} role="alert">
              {error}
            </p>
          )}
        </form>
      )}

      {phase === "done" && (
        <p style={hintStyle}>Approved. Your other device is signing in now.</p>
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
  fontSize: 24,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
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
