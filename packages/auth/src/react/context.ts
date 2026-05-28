import { createContext, useContext } from "react";

import type { MrbdAuthClient } from "../client.js";
import type { MrbdSession } from "../types.js";

export type MrbdAuthStatus = "loading" | "signed-in" | "signed-out";

export type MrbdAuthContextValue = {
  /** The underlying client. Use it for advanced flows not covered by the components. */
  client: MrbdAuthClient;
  /** The current stored session, or null when signed out. */
  session: MrbdSession | null;
  /** Coarse status, convenient for gating UI. */
  status: MrbdAuthStatus;
  /** Re-read and refresh the stored session from MRBD auth services. */
  refresh: () => Promise<MrbdSession | null>;
  /** Revoke the session and clear local storage. */
  signOut: () => Promise<void>;
};

export const MrbdAuthContext = createContext<MrbdAuthContextValue | null>(null);

export function useMrbdAuth(): MrbdAuthContextValue {
  const value = useContext(MrbdAuthContext);
  if (!value) {
    throw new Error("useMrbdAuth must be used within an <MrbdAuthProvider>.");
  }
  return value;
}
