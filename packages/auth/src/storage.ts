import { MrbdAuthError } from "./error.js";
import type { MrbdAuthStorage, MrbdSession } from "./types.js";

export const DEFAULT_MRBD_AUTH_STORAGE_KEY = "mrbd.auth.session";

export function getDefaultAuthStorage(): MrbdAuthStorage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
}

export function readMrbdSession(storage: MrbdAuthStorage | null, key: string): MrbdSession | null {
  if (!storage) return null;

  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as MrbdSession;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function writeMrbdSession(storage: MrbdAuthStorage | null, key: string, session: MrbdSession): void {
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(session));
  } catch (error) {
    throw new MrbdAuthError("storage_unavailable", "Unable to store the MRBD auth session.", {
      details: error,
    });
  }
}

export function removeMrbdSession(storage: MrbdAuthStorage | null, key: string): void {
  if (!storage) return;
  storage.removeItem(key);
}
