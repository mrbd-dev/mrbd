export type WebStorageArea = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type StoredJsonResult<T> =
  | { ok: true; value: T }
  | { ok: false; value: T | null; error: "unavailable" | "missing" | "invalid" };

function getStorage(storage?: WebStorageArea): WebStorageArea | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
}

export function readStoredJson<T>(
  key: string,
  fallback: T,
  storage?: WebStorageArea,
): StoredJsonResult<T> {
  const area = getStorage(storage);
  if (!area) return { ok: false, value: null, error: "unavailable" };

  const raw = area.getItem(key);
  if (raw === null) return { ok: false, value: fallback, error: "missing" };

  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, value: fallback, error: "invalid" };
  }
}

export function writeStoredJson<T>(
  key: string,
  value: T,
  storage?: WebStorageArea,
): { ok: true } | { ok: false; error: "unavailable" | "quota" } {
  const area = getStorage(storage);
  if (!area) return { ok: false, error: "unavailable" };

  try {
    area.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, error: "quota" };
  }
}

export function removeStoredValue(
  key: string,
  storage?: WebStorageArea,
): { ok: true } | { ok: false; error: "unavailable" } {
  const area = getStorage(storage);
  if (!area) return { ok: false, error: "unavailable" };

  area.removeItem(key);
  return { ok: true };
}
