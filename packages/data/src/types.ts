export type MrbdJson = Record<string, unknown>;

/**
 * Supplies the app-scoped access token for data requests, and optionally a way
 * to refresh it. Pair with `@mrbd/auth` via {@link tokenProviderFromAuth}.
 */
export type MrbdTokenProvider = {
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>;
  /** Called once on a 401 before the request is retried. */
  refresh?: () => Promise<unknown>;
};

export type MrbdDataConfig = {
  /** Reverse-domain app id this client reads/writes data for. */
  appId: string;
  /** MRBD data service base URL. Defaults to the hosted service. */
  dataUrl?: string;
  tokenProvider: MrbdTokenProvider;
  fetch?: typeof fetch;
  eventSource?: typeof EventSource;
};

export type MrbdDocument<T extends MrbdJson = MrbdJson> = {
  /** Client-facing document id. */
  id: string;
  data: T;
  createdAt: string;
  updatedAt: string;
};

export type MrbdListOptions = {
  limit?: number;
  cursor?: string;
  order?: "asc" | "desc";
  /** Equality filter over top-level fields of the stored document. */
  filter?: MrbdJson;
};

export type MrbdListResult<T extends MrbdJson = MrbdJson> = {
  documents: MrbdDocument<T>[];
  /** Cursor for the next page, or null when there are no more results. */
  cursor: string | null;
};

export type MrbdSubscribeOptions = {
  /** Only deliver documents changed at or after this ISO timestamp. */
  since?: string;
  onError?: (error: MrbdJson | Event) => void;
};

/**
 * Minimal shape of an `@mrbd/auth` client, used by {@link tokenProviderFromAuth}
 * without taking a hard dependency on the auth package.
 */
export type MrbdAuthLike = {
  getSession: () => Promise<{ accessToken: string } | null>;
  refreshSession?: () => Promise<{ accessToken: string } | null>;
};
