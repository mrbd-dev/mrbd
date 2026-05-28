import type { CSSProperties, ReactNode } from "react";

import type { MrbdSession } from "../types.js";
import { useMrbdAuth } from "./context.js";
import { MrbdSignInScreen } from "./MrbdSignInScreen.js";

export type MrbdAuthGateProps = {
  /** Rendered once a session exists. */
  children: ReactNode;
  /** Rendered while the initial session check is in flight. */
  loading?: ReactNode;
  /** Rendered when signed out. Defaults to <MrbdSignInScreen />. */
  fallback?: ReactNode;
  /** Forwarded to the default sign-in screen when no custom `fallback` is given. */
  onSignedIn?: (session: MrbdSession) => void;
};

/**
 * Gates its children behind an MRBD session. Shows the built-in sign-in screen
 * when signed out unless a custom `fallback` is provided.
 */
export function MrbdAuthGate({ children, loading, fallback, onSignedIn }: MrbdAuthGateProps) {
  const { status } = useMrbdAuth();

  if (status === "loading") {
    return <>{loading ?? <DefaultLoading />}</>;
  }

  if (status === "signed-out") {
    return <>{fallback ?? <MrbdSignInScreen onSignedIn={onSignedIn} />}</>;
  }

  return <>{children}</>;
}

function DefaultLoading() {
  const style: CSSProperties = {
    display: "grid",
    placeItems: "center",
    height: "100%",
    color: "#d4d4d8",
    background: "#0a0a0f",
    fontWeight: 700,
  };
  return <div style={style}>Loading…</div>;
}
