import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { createMrbdAuth, MrbdAuthClient } from "../client.js";
import type { MrbdAuthConfig, MrbdSession } from "../types.js";
import { MrbdAuthContext, type MrbdAuthContextValue, type MrbdAuthStatus } from "./context.js";

export type MrbdAuthProviderProps = Partial<MrbdAuthConfig> & {
  children: ReactNode;
  /**
   * Provide a pre-built client instead of letting the provider create one.
   * When omitted, the provider builds a client from `appId` / `authUrl` / etc.
   */
  client?: MrbdAuthClient;
};

export function MrbdAuthProvider({ children, client: providedClient, ...config }: MrbdAuthProviderProps) {
  const client = useMemo(() => {
    if (providedClient) return providedClient;
    if (!config.appId) {
      throw new Error("MrbdAuthProvider requires an `appId` (or a pre-built `client`).");
    }
    return createMrbdAuth(config as MrbdAuthConfig);
    // appId / authUrl are the only fields that change client identity in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providedClient, config.appId, config.authUrl]);

  const [session, setSession] = useState<MrbdSession | null>(null);
  const [status, setStatus] = useState<MrbdAuthStatus>("loading");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setStatus("loading");
    void client.getSession().then((current) => {
      if (!active) return;
      setSession(current);
      setStatus(current ? "signed-in" : "signed-out");
    });

    const unsubscribe = client.onAuthStateChange((next) => {
      if (!active) return;
      setSession(next);
      setStatus(next ? "signed-in" : "signed-out");
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [client]);

  const value = useMemo<MrbdAuthContextValue>(
    () => ({
      client,
      session,
      status,
      refresh: () => client.refreshSession(),
      signOut: () => client.signOut(),
    }),
    [client, session, status],
  );

  return <MrbdAuthContext.Provider value={value}>{children}</MrbdAuthContext.Provider>;
}
