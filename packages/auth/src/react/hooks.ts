import { useCallback, useEffect, useRef, useState } from "react";

import { MrbdAuthError } from "../error.js";
import type { MrbdAuthRequest, MrbdSession } from "../types.js";
import { useMrbdAuth } from "./context.js";

function messageFrom(error: unknown): string {
  if (error instanceof MrbdAuthError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/* -------------------------------------------------------------------------- */
/* Email / keyboard sign-in                                                   */
/* -------------------------------------------------------------------------- */

export type MrbdEmailSignInPhase =
  | "email"
  | "sending_otp"
  | "otp"
  | "verifying"
  | "done"
  | "error";

export type UseMrbdEmailSignInOptions = {
  /** Called once this surface receives its own session. */
  onSignedIn?: (session: MrbdSession) => void;
};

export type MrbdEmailSignIn = {
  /** Where the flow currently is. */
  phase: MrbdEmailSignInPhase;
  /** The email the OTP was sent to (empty until `sendOtp` succeeds). */
  email: string;
  /** Human-readable error for the current step, or null. */
  error: string | null;
  /** Send a one-time code to `email` and advance to `"otp"`. */
  sendOtp: (email: string) => Promise<void>;
  /** Verify the entered `token`; on success advances to `"done"`. */
  verifyOtp: (token: string) => Promise<void>;
  /** Re-send the code to the same email. */
  resend: () => Promise<void>;
  /** Return to the initial email step. */
  reset: () => void;
};

/**
 * Headless email-OTP sign-in for keyboard surfaces (phone/desktop web).
 *
 * This is the logic behind {@link MrbdEmailSignInScreen} with no markup, so you
 * can build a fully custom sign-in UI and keep MRBD's hosted identity (and with
 * it `@mrbd/data` / `@mrbd/storage`). Render whatever you want for each `phase`
 * and call `sendOtp` / `verifyOtp`.
 *
 * @example
 * const auth = useMrbdEmailSignIn({ onSignedIn: () => router.refresh() });
 * // ...
 * <form onSubmit={(e) => { e.preventDefault(); auth.sendOtp(email); }}>...
 */
export function useMrbdEmailSignIn(options: UseMrbdEmailSignInOptions = {}): MrbdEmailSignIn {
  const { client } = useMrbdAuth();
  const { onSignedIn } = options;
  const [phase, setPhase] = useState<MrbdEmailSignInPhase>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sendOtp = useCallback(
    async (nextEmail: string) => {
      const normalized = nextEmail.trim().toLowerCase();
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
    [client],
  );

  const verifyOtp = useCallback(
    async (token: string) => {
      setError(null);
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

  const resend = useCallback(async () => {
    if (!email) return;
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

  const reset = useCallback(() => {
    setError(null);
    setPhase("email");
  }, []);

  return { phase, email, error, sendOtp, verifyOtp, resend, reset };
}

/* -------------------------------------------------------------------------- */
/* Device-pairing sign-in (glasses)                                           */
/* -------------------------------------------------------------------------- */

export type MrbdDeviceSignInPhase =
  | "starting"
  | "await_email"
  | "sending_otp"
  | "otp"
  | "verifying"
  | "done"
  | "error";

export type UseMrbdDeviceSignInOptions = {
  /** Called once the glasses receive their own session. */
  onSignedIn?: (session: MrbdSession) => void;
  /**
   * Start the pairing flow automatically on mount. Defaults to true. Set false
   * to drive it yourself (e.g. behind a "Sign in" button) and call `start()`.
   */
  autoStart?: boolean;
};

export type MrbdDeviceSignIn = {
  /** Where the pairing flow currently is. */
  phase: MrbdDeviceSignInPhase;
  /** The active request (verification URL + user code) once `"await_email"`. */
  request: MrbdAuthRequest | null;
  /** Human-readable error for the current step, or null. */
  error: string | null;
  /** Begin (or restart) a pairing request. */
  start: () => Promise<void>;
  /** Verify the OTP the user read from their email; advances to `"done"`. */
  verifyOtp: (token: string) => Promise<void>;
};

/**
 * Headless device-pairing sign-in for the glasses.
 *
 * This is the logic behind {@link MrbdSignInScreen} with no markup. It starts a
 * pairing request, surfaces `request.verificationUrl` + `request.userCode` for
 * you to display, automatically sends the OTP once the user submits their email
 * on their phone (the `email_submitted` event), and exchanges the code the user
 * enters on the glasses for a session. The device-approval path
 * (`approved` -> `claimSession`) is handled by the client and lands on `"done"`.
 */
export function useMrbdDeviceSignIn(options: UseMrbdDeviceSignInOptions = {}): MrbdDeviceSignIn {
  const { client } = useMrbdAuth();
  const { onSignedIn, autoStart = true } = options;
  const [phase, setPhase] = useState<MrbdDeviceSignInPhase>("starting");
  const [request, setRequest] = useState<MrbdAuthRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  // Keep the latest onSignedIn without forcing `start` to change identity.
  const onSignedInRef = useRef(onSignedIn);
  useEffect(() => {
    onSignedInRef.current = onSignedIn;
  }, [onSignedIn]);

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
          } else if (event.type === "verified") {
            // Reached via the device-approval path (no OTP on this device).
            setPhase("done");
            void client.getSession().then((session) => {
              if (session) onSignedInRef.current?.(session);
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
    if (!autoStart || startedRef.current) return;
    startedRef.current = true;
    void start();
    return () => {
      client.close();
    };
  }, [autoStart, start, client]);

  const verifyOtp = useCallback(
    async (token: string) => {
      setError(null);
      setPhase("verifying");
      try {
        const session = await client.verifyOtp(token);
        setPhase("done");
        onSignedInRef.current?.(session);
      } catch (verifyError) {
        setError(messageFrom(verifyError));
        setPhase("otp");
      }
    },
    [client],
  );

  return { phase, request, error, start, verifyOtp };
}

/* -------------------------------------------------------------------------- */
/* Approve another device                                                     */
/* -------------------------------------------------------------------------- */

export type MrbdApproveDevicePhase = "idle" | "approving" | "done" | "error";

export type UseMrbdApproveDeviceOptions = {
  /** Called after the other device's pairing has been approved. */
  onApproved?: () => void;
};

export type MrbdApproveDevice = {
  /** Where the approval currently is. */
  phase: MrbdApproveDevicePhase;
  /** Whether this surface has a session to authorize the approval. */
  canApprove: boolean;
  /** Human-readable error for the current step, or null. */
  error: string | null;
  /** Approve the given short `userCode` from another device. */
  approve: (userCode: string) => Promise<void>;
  /** Reset back to idle. */
  reset: () => void;
};

/**
 * Headless "approve another device" flow for an already-signed-in surface.
 *
 * This is the logic behind {@link MrbdApproveDeviceScreen}: the user enters the
 * short code shown on the other device (e.g. the glasses) and this calls
 * `approveDevice`, after which the other device receives its own session
 * without an OTP.
 */
export function useMrbdApproveDevice(options: UseMrbdApproveDeviceOptions = {}): MrbdApproveDevice {
  const { client, status } = useMrbdAuth();
  const { onApproved } = options;
  const [phase, setPhase] = useState<MrbdApproveDevicePhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const approve = useCallback(
    async (userCode: string) => {
      const normalized = userCode.replace(/[\s-]/g, "").toUpperCase();
      if (!normalized) {
        setError("Enter the code shown on the other device.");
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
    [client, onApproved],
  );

  const reset = useCallback(() => {
    setError(null);
    setPhase("idle");
  }, []);

  return { phase, canApprove: status === "signed-in", error, approve, reset };
}
