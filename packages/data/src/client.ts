import { MrbdDataError, type MrbdDataErrorCode } from "./error.js";
import type {
  MrbdAuthLike,
  MrbdDataConfig,
  MrbdDocument,
  MrbdJson,
  MrbdListOptions,
  MrbdListResult,
  MrbdSubscribeOptions,
  MrbdTokenProvider,
} from "./types.js";

const DEFAULT_DATA_URL = "https://data.mrbd.io";

export class MrbdDataClient {
  readonly appId: string;
  readonly dataUrl: string;

  private readonly tokenProvider: MrbdTokenProvider;
  private readonly fetcher: typeof fetch;
  private readonly EventSourceCtor?: typeof EventSource;

  constructor(config: MrbdDataConfig) {
    if (!config.appId.trim()) {
      throw new MrbdDataError("invalid_config", "MRBD data requires a non-empty appId.");
    }

    this.appId = config.appId;
    this.dataUrl = normalizeUrl(config.dataUrl ?? DEFAULT_DATA_URL);
    this.tokenProvider = config.tokenProvider;

    const resolvedFetch = config.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!resolvedFetch) {
      throw new MrbdDataError("browser_api_unavailable", "MRBD data requires fetch.");
    }
    this.fetcher = resolvedFetch;
    this.EventSourceCtor = config.eventSource ?? globalThis.EventSource;
  }

  collection<T extends MrbdJson = MrbdJson>(name: string): MrbdCollection<T> {
    return new MrbdCollection<T>(this, name);
  }

  // --- Internal request plumbing (used by MrbdCollection) ------------------

  /** @internal */
  async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: { body?: unknown; query?: Record<string, string | undefined> } = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);

    const send = async (token: string | null | undefined): Promise<Response> => {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "x-mrbd-app-id": this.appId,
      };
      if (options.body !== undefined) headers["Content-Type"] = "application/json";
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        return await this.fetcher(url, {
          method,
          headers,
          ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        });
      } catch (error) {
        throw new MrbdDataError("network_error", "Unable to reach the MRBD data service.", {
          details: error,
        });
      }
    };

    let response = await send(await this.tokenProvider.getAccessToken());

    if (response.status === 401 && this.tokenProvider.refresh) {
      await this.tokenProvider.refresh();
      response = await send(await this.tokenProvider.getAccessToken());
    }

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new MrbdDataError(mapErrorCode(data, response.status), getErrorMessage(data), {
        status: response.status,
        details: data,
      });
    }

    return data as T;
  }

  /** @internal */
  buildEventSourceUrl(path: string, query: Record<string, string | undefined>): string {
    return this.buildUrl(path, query);
  }

  /** @internal */
  get eventSourceCtor(): typeof EventSource | undefined {
    return this.EventSourceCtor;
  }

  /** @internal */
  getToken(): string | null | undefined | Promise<string | null | undefined> {
    return this.tokenProvider.getAccessToken();
  }

  private buildUrl(path: string, query?: Record<string, string | undefined>): string {
    const url = new URL(`${this.dataUrl}${path.startsWith("/") ? path : `/${path}`}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }
}

export class MrbdCollection<T extends MrbdJson = MrbdJson> {
  constructor(
    private readonly client: MrbdDataClient,
    private readonly name: string,
  ) {}

  async create(data: T, options: { id?: string } = {}): Promise<MrbdDocument<T>> {
    const body: { data: T; id?: string } = { data };
    if (options.id !== undefined) body.id = options.id;
    const result = await this.client.request<{ document: MrbdDocument<T> }>(
      "POST",
      `/v1/data/${encodeURIComponent(this.name)}`,
      { body },
    );
    return result.document;
  }

  /** Returns the document, or `null` when it does not exist. */
  async get(id: string): Promise<MrbdDocument<T> | null> {
    try {
      const result = await this.client.request<{ document: MrbdDocument<T> }>(
        "GET",
        `/v1/data/${encodeURIComponent(this.name)}/${encodeURIComponent(id)}`,
      );
      return result.document;
    } catch (error) {
      if (error instanceof MrbdDataError && error.code === "not_found") return null;
      throw error;
    }
  }

  async list(options: MrbdListOptions = {}): Promise<MrbdListResult<T>> {
    const query: Record<string, string | undefined> = {
      order: options.order,
      limit: options.limit !== undefined ? String(options.limit) : undefined,
      cursor: options.cursor,
      filter: options.filter ? JSON.stringify(options.filter) : undefined,
    };
    return this.client.request<MrbdListResult<T>>(
      "GET",
      `/v1/data/${encodeURIComponent(this.name)}`,
      { query },
    );
  }

  /** Replaces the document body (creating it if absent). */
  async set(id: string, data: T): Promise<MrbdDocument<T>> {
    const result = await this.client.request<{ document: MrbdDocument<T> }>(
      "PUT",
      `/v1/data/${encodeURIComponent(this.name)}/${encodeURIComponent(id)}`,
      { body: { data } },
    );
    return result.document;
  }

  /** Shallow-merges `patch` into the existing document body. */
  async update(id: string, patch: Partial<T>): Promise<MrbdDocument<T>> {
    const result = await this.client.request<{ document: MrbdDocument<T> }>(
      "PATCH",
      `/v1/data/${encodeURIComponent(this.name)}/${encodeURIComponent(id)}`,
      { body: { data: patch } },
    );
    return result.document;
  }

  async remove(id: string): Promise<void> {
    await this.client.request<{ ok: true }>(
      "DELETE",
      `/v1/data/${encodeURIComponent(this.name)}/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Subscribes to upserts (creates + updates) in this collection for the signed
   * in user, so a change made on one device (e.g. a phone) streams to another
   * (e.g. the glasses). Returns an unsubscribe function. Deletes are not
   * streamed; re-list to reconcile removals.
   */
  subscribe(handler: (document: MrbdDocument<T>) => void, options: MrbdSubscribeOptions = {}): () => void {
    const EventSourceCtor = this.client.eventSourceCtor;
    if (!EventSourceCtor) {
      throw new MrbdDataError(
        "browser_api_unavailable",
        "MRBD data subscriptions require EventSource.",
      );
    }

    let source: EventSource | null = null;
    let closed = false;

    void Promise.resolve(this.client.getToken()).then((token) => {
      if (closed) return;
      const url = this.client.buildEventSourceUrl(
        `/v1/data/${encodeURIComponent(this.name)}/events`,
        { access_token: token ?? undefined, since: options.since },
      );
      source = new EventSourceCtor(url);
      source.addEventListener("change", (event) => {
        const message = event as MessageEvent<string>;
        try {
          handler(JSON.parse(message.data) as MrbdDocument<T>);
        } catch {
          // Ignore malformed frames.
        }
      });
      source.onerror = (event) => options.onError?.(event);
    });

    return () => {
      closed = true;
      source?.close();
    };
  }
}

export function createMrbdData(config: MrbdDataConfig): MrbdDataClient {
  return new MrbdDataClient(config);
}

/**
 * Adapts an `@mrbd/auth` client into a {@link MrbdTokenProvider}, wiring the
 * stored session's access token and automatic refresh on expiry.
 */
export function tokenProviderFromAuth(auth: MrbdAuthLike): MrbdTokenProvider {
  const provider: MrbdTokenProvider = {
    getAccessToken: async () => (await auth.getSession())?.accessToken ?? null,
  };
  if (auth.refreshSession) {
    const refresh = auth.refreshSession.bind(auth);
    provider.refresh = async () => {
      await refresh();
    };
  }
  return provider;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown): string {
  if (typeof data === "object" && data && "message" in data && typeof data.message === "string") {
    return data.message;
  }
  return "The MRBD data service rejected the request.";
}

function mapErrorCode(data: unknown, status: number): MrbdDataErrorCode {
  if (typeof data === "object" && data && "code" in data && typeof data.code === "string") {
    const code = data.code;
    switch (code) {
      case "invalid_request":
      case "invalid_token":
      case "forbidden":
      case "not_found":
      case "conflict":
      case "payload_too_large":
      case "rate_limited":
        return code;
      default:
        break;
    }
  }
  if (status === 401) return "invalid_token";
  if (status === 404) return "not_found";
  return "server_error";
}
