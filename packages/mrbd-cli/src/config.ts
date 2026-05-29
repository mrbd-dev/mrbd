import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// The MRBD developer Supabase project. Defaults match the values used across
// the repo for local development; override with environment variables to point
// the CLI at a hosted instance. The publishable (anon) key is safe to embed —
// row-level security restricts every developer to their own apps.
const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: (process.env.MRBD_SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(
      /\/+$/,
      "",
    ),
    publishableKey:
      process.env.MRBD_SUPABASE_PUBLISHABLE_KEY ??
      DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  };
}

export type Credentials = {
  supabaseUrl: string;
  publishableKey: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  user: {
    id: string;
    email: string | null;
  };
};

function configDir(): string {
  return join(homedir(), ".mrbd");
}

function credentialsPath(): string {
  return join(configDir(), "credentials.json");
}

export async function readCredentials(): Promise<Credentials | null> {
  try {
    const raw = await readFile(credentialsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (
      typeof parsed.supabaseUrl === "string" &&
      typeof parsed.publishableKey === "string" &&
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      parsed.user &&
      typeof parsed.user.id === "string"
    ) {
      return {
        supabaseUrl: parsed.supabaseUrl,
        publishableKey: parsed.publishableKey,
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : null,
        user: {
          id: parsed.user.id,
          email: typeof parsed.user.email === "string" ? parsed.user.email : null,
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeCredentials(credentials: Credentials): Promise<void> {
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
  await writeFile(credentialsPath(), `${JSON.stringify(credentials, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

export async function clearCredentials(): Promise<void> {
  await rm(credentialsPath(), { force: true });
}
