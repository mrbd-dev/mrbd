import { MrbdStorageError, type MrbdStorageErrorCode } from "./error.js";
import type {
  MrbdAuthLike,
  MrbdStorageConfig,
  MrbdStorageObject,
  MrbdTokenProvider,
  MrbdUploadBody,
  MrbdUploadOptions,
} from "./types.js";

const DEFAULT_DATA_URL = "https://data.mrbd.io";

type SignedUploadTarget = {
  path: string;
  url: string;
  token: string;
  method: "PUT";
  headers: Record<string, string>;
};

export class MrbdStorageClient {
  readonly appId: string;
  readonly dataUrl: string;

  private readonly tokenProvider: MrbdTokenProvider;
  private readonly fetcher: typeof fetch;

  constructor(config: MrbdStorageConfig) {
    if (!config.appId.trim()) {
      throw new MrbdStorageError("invalid_config", "MRBD storage requires a non-empty appId.");
    }

    this.appId = config.appId;
    this.dataUrl = normalizeUrl(config.dataUrl ?? DEFAULT_DATA_URL);
    this.tokenProvider = config.tokenProvider;

    const resolvedFetch = config.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!resolvedFetch) {
      throw new MrbdStorageError("browser_api_unavailable", "MRBD storage requires fetch.");
    }
    this.fetcher = resolvedFetch;
  }

  /**
   * Uploads a file to `path` (relative to your app/user space). MRBD mints a
   * short-lived signed URL and the bytes are sent straight to storage.
   */
  async upload(
    path: string,
    body: MrbdUploadBody,
    options: MrbdUploadOptions = {},
  ): Promise<{ path: string }> {
    const requestBody: { path: string; contentType?: string; upsert?: boolean } = { path };
    if (options.contentType !== undefined) requestBody.contentType = options.contentType;
    if (options.upsert !== undefined) requestBody.upsert = options.upsert;

    const target = await this.request<SignedUploadTarget>("POST", "/v1/storage/upload-url", {
      body: requestBody,
    });

    let uploadResponse: Response;
    try {
      uploadResponse = await this.fetcher(target.url, {
        method: target.method,
        headers: target.headers,
        body: body as BodyInit,
      });
    } catch (error) {
      throw new MrbdStorageError("network_error", "Unable to upload to MRBD storage.", {
        details: error,
      });
    }

    if (!uploadResponse.ok) {
      throw new MrbdStorageError("upload_failed", "The file upload was rejected by storage.", {
        status: uploadResponse.status,
      });
    }

    return { path: target.path };
  }

  /** Returns a short-lived signed URL to download/view the object at `path`. */
  async getUrl(path: string): Promise<string> {
    const result = await this.request<{ url: string }>("GET", "/v1/storage/download-url", {
      query: { path },
    });
    return result.url;
  }

  /** Lists objects under `prefix` (relative to your app/user space). */
  async list(prefix?: string): Promise<MrbdStorageObject[]> {
    const query: Record<string, string | undefined> = { prefix };
    const result = await this.request<{ objects: MrbdStorageObject[] }>(
      "GET",
      "/v1/storage/list",
      { query },
    );
    return result.objects;
  }

  async remove(path: string): Promise<void> {
    await this.request<{ ok: true }>("DELETE", "/v1/storage/object", { query: { path } });
  }

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
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
        throw new MrbdStorageError("network_error", "Unable to reach the MRBD storage service.", {
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
      throw new MrbdStorageError(mapErrorCode(data, response.status), getErrorMessage(data), {
        status: response.status,
        details: data,
      });
    }

    return data as T;
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

export function createMrbdStorage(config: MrbdStorageConfig): MrbdStorageClient {
  return new MrbdStorageClient(config);
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
  return "The MRBD storage service rejected the request.";
}

function mapErrorCode(data: unknown, status: number): MrbdStorageErrorCode {
  if (typeof data === "object" && data && "code" in data && typeof data.code === "string") {
    const code = data.code;
    switch (code) {
      case "invalid_request":
      case "invalid_token":
      case "forbidden":
      case "not_found":
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
