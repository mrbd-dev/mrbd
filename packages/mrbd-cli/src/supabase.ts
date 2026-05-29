import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { WebSocket as WsWebSocket } from "ws";

import {
  clearCredentials,
  getSupabaseConfig,
  readCredentials,
  writeCredentials,
} from "./config.js";

// supabase-js eagerly constructs a realtime client, which requires a global
// WebSocket. Node only ships one natively from v22, so polyfill it for older
// runtimes (our engines allow >=18.18). The CLI never opens a realtime channel,
// so this connection is never actually established.
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WsWebSocket;
}

// CLI sessions are managed manually: we persist tokens to ~/.mrbd and refresh
// on demand, so the in-memory client must not try to persist or auto-refresh.
const CLI_AUTH_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

export function createAnonClient(): SupabaseClient {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient(url, publishableKey, CLI_AUTH_OPTIONS);
}

export class NotLoggedInError extends Error {
  constructor(message = "You are not logged in. Run `mrbd login` first.") {
    super(message);
    this.name = "NotLoggedInError";
  }
}

// Returns a Supabase client authenticated as the stored developer. The access
// token is refreshed when expired and the rotated tokens are written back to
// disk so subsequent commands stay signed in.
export async function createAuthedClient(): Promise<{
  client: SupabaseClient;
  email: string | null;
  userId: string;
}> {
  const credentials = await readCredentials();
  if (!credentials) {
    throw new NotLoggedInError();
  }

  const client = createClient(
    credentials.supabaseUrl,
    credentials.publishableKey,
    CLI_AUTH_OPTIONS,
  );

  const { data, error } = await client.auth.setSession({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
  });

  if (error || !data.session) {
    await clearCredentials();
    throw new NotLoggedInError(
      "Your session has expired. Run `mrbd login` to sign in again.",
    );
  }

  await writeCredentials({
    ...credentials,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? null,
    user: {
      id: data.session.user.id,
      email: data.session.user.email ?? null,
    },
  });

  return {
    client,
    email: data.session.user.email ?? null,
    userId: data.session.user.id,
  };
}
