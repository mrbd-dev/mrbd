/**
 * Supplies the app-scoped access token for storage requests, and optionally a
 * way to refresh it. Pair with `@mrbd/auth` via {@link tokenProviderFromAuth}.
 */
export type MrbdTokenProvider = {
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>;
  /** Called once on a 401 before the request is retried. */
  refresh?: () => Promise<unknown>;
};

export type MrbdStorageConfig = {
  /** Reverse-domain app id this client stores files for. */
  appId: string;
  /** MRBD data/storage service base URL. Defaults to the hosted service. */
  dataUrl?: string;
  tokenProvider: MrbdTokenProvider;
  fetch?: typeof fetch;
};

export type MrbdUploadBody = Blob | ArrayBuffer | ArrayBufferView | string;

export type MrbdUploadOptions = {
  contentType?: string;
  /** Overwrite an existing object at the same path. Defaults to false. */
  upsert?: boolean;
};

export type MrbdStorageObject = {
  /** Path relative to the requested prefix (or the user root). */
  path: string;
  size: number | null;
  contentType: string | null;
  lastModified: string | null;
};

/**
 * Minimal shape of an `@mrbd/auth` client, used by {@link tokenProviderFromAuth}
 * without taking a hard dependency on the auth package.
 */
export type MrbdAuthLike = {
  getSession: () => Promise<{ accessToken: string } | null>;
  refreshSession?: () => Promise<{ accessToken: string } | null>;
};
