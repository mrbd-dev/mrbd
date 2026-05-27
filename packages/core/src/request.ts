export const MRBD_REQUESTED_WITH_HEADER = "x-requested-with";

export const MRBD_SMARTGLASS_BROWSER_REQUESTED_WITH = "com.meta.smartglass.app.browser";

export type MrbdHeaderRecord = Record<string, string | string[] | null | undefined>;

export type MrbdHeadersLike = {
  get: (name: string) => string | null | undefined;
};

export type MrbdRequestLike = {
  headers: MrbdHeaderSource;
};

export type MrbdHeaderSource =
  | MrbdHeadersLike
  | MrbdHeaderRecord
  | Iterable<readonly [string, string]>
  | MrbdRequestLike;

function hasHeaders(value: unknown): value is MrbdRequestLike {
  if (typeof value !== "object" || value === null || !("headers" in value)) {
    return false;
  }

  const headers = (value as { headers?: unknown }).headers;
  return typeof headers === "object" && headers !== null;
}

function hasGet(value: unknown): value is MrbdHeadersLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "get" in value &&
    typeof (value as { get?: unknown }).get === "function"
  );
}

function isIterableHeaderEntries(value: unknown): value is Iterable<readonly [string, string]> {
  return typeof value === "object" && value !== null && Symbol.iterator in value;
}

function getHeaderValue(headers: MrbdHeaderSource, name: string): string | null {
  if (hasHeaders(headers)) {
    return getHeaderValue(headers.headers, name);
  }

  if (hasGet(headers)) {
    return headers.get(name) ?? null;
  }

  const lowerName = name.toLowerCase();

  if (isIterableHeaderEntries(headers)) {
    for (const [key, value] of headers) {
      if (key.toLowerCase() === lowerName) return value;
    }

    return null;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lowerName) continue;
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }

  return null;
}

export function getMrbdRequestedWithHeader(headers: MrbdHeaderSource): string | null {
  return getHeaderValue(headers, MRBD_REQUESTED_WITH_HEADER);
}

export function isMetaRayBanDisplayRequest(headers: MrbdHeaderSource): boolean {
  const requestedWith = getMrbdRequestedWithHeader(headers);
  return requestedWith?.trim().toLowerCase() === MRBD_SMARTGLASS_BROWSER_REQUESTED_WITH;
}
