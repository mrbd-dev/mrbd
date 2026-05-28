import { createDeviceChallenge, createDeviceSecret } from "./crypto.js";
import { MrbdAuthError } from "./error.js";
import {
  DEFAULT_MRBD_AUTH_STORAGE_KEY,
  getDefaultAuthStorage,
  readMrbdSession,
  removeMrbdSession,
  writeMrbdSession,
} from "./storage.js";
import type {
  CreateAuthRequestResponse,
  MrbdAuthConfig,
  MrbdAuthEvent,
  MrbdAuthEventStream,
  MrbdAuthRequest,
  MrbdAuthStateCallback,
  MrbdAuthStorage,
  MrbdSession,
  RefreshSessionResponse,
  SignInWithCodeOptions,
  StartSignInOptions,
  VerifyOtpResponse,
} from "./types.js";

const defaultAuthUrl = "https://auth.mrbd.io";

type ActiveAuthRequest = MrbdAuthRequest & {
  deviceSecret: string;
};

type EventConnection = {
  close(): void;
};

export class MrbdAuthClient {
  readonly appId: string;
  readonly authUrl: string;

  private readonly fetcher: typeof fetch;
  private readonly storage: MrbdAuthStorage | null;
  private readonly storageKey: string;
  private readonly EventSourceCtor?: typeof EventSource;
  private readonly WebSocketCtor?: typeof WebSocket;
  private activeRequest: ActiveAuthRequest | null = null;
  private eventConnection: EventConnection | null = null;
  private stateCallbacks = new Set<MrbdAuthStateCallback>();

  constructor(config: MrbdAuthConfig) {
    if (!config.appId.trim()) {
      throw new MrbdAuthError("invalid_config", "MRBD auth requires a non-empty appId.");
    }

    this.appId = config.appId;
    this.authUrl = normalizeAuthUrl(config.authUrl ?? defaultAuthUrl);
    this.fetcher = config.fetch ?? globalThis.fetch;
    this.storage = config.storage === undefined ? getDefaultAuthStorage() : config.storage;
    this.storageKey = config.storageKey ?? `${DEFAULT_MRBD_AUTH_STORAGE_KEY}:${this.appId}`;
    this.EventSourceCtor = config.eventSource ?? globalThis.EventSource;
    this.WebSocketCtor = config.webSocket ?? globalThis.WebSocket;

    if (!this.fetcher) {
      throw new MrbdAuthError("browser_api_unavailable", "MRBD auth requires fetch.");
    }
  }

  async startSignIn(options: StartSignInOptions = {}): Promise<MrbdAuthRequest> {
    const deviceSecret = createDeviceSecret();
    const deviceChallenge = await createDeviceChallenge(deviceSecret);
    const response = await this.request<CreateAuthRequestResponse>("/v1/device/authorize", {
      method: "POST",
      body: {
        appId: this.appId,
        deviceChallenge,
        deviceChallengeMethod: "S256",
      },
    });

    const request: ActiveAuthRequest = {
      requestId: response.requestId,
      deviceCode: response.deviceCode,
      userCode: response.userCode,
      verificationUrl: response.verificationUrl,
      expiresAt: response.expiresAt,
      status: "pending",
      deviceSecret,
    };

    this.activeRequest = request;
    this.connectEvents(response.events, options.onEvent);

    return toPublicRequest(request);
  }

  async signInWithCode(options: SignInWithCodeOptions): Promise<MrbdSession> {
    const emailSubmitted = new Promise<string>((resolve, reject) => {
      void this.startSignIn({
        onEvent: (event) => {
          options.onEvent?.(event);

          if (event.type === "email_submitted") {
            resolve(event.email);
          } else if (event.type === "expired") {
            reject(new MrbdAuthError("request_unavailable", "The MRBD auth request expired."));
          } else if (event.type === "error") {
            reject(new MrbdAuthError("server_error", event.message));
          }
        },
      })
        .then((request) => options.onRequest?.(request))
        .catch(reject);
    });

    const email = await emailSubmitted;
    await this.sendOtp(email);

    const request = toPublicRequest(this.requireActiveRequest());
    const token = await options.getOtp(request);
    return this.verifyOtp(token);
  }

  async sendOtp(email?: string): Promise<void> {
    const request = this.requireActiveRequest();
    const resolvedEmail = email ?? request.email;

    if (!resolvedEmail) {
      throw new MrbdAuthError(
        "email_unavailable",
        "No email is available for this MRBD auth request.",
      );
    }

    await this.request<unknown>("/v1/device/send-otp", {
      method: "POST",
      body: {
        appId: this.appId,
        requestId: request.requestId,
        deviceCode: request.deviceCode,
        email: resolvedEmail,
      },
    });

    this.updateActiveRequest({ status: "otp_sent", email: resolvedEmail });
  }

  async verifyOtp(token: string): Promise<MrbdSession> {
    const request = this.requireActiveRequest();

    const response = await this.request<VerifyOtpResponse>("/v1/device/verify-otp", {
      method: "POST",
      body: {
        appId: this.appId,
        requestId: request.requestId,
        deviceCode: request.deviceCode,
        deviceSecret: request.deviceSecret,
        token,
      },
    });

    this.storeSession(response.session);
    this.updateActiveRequest({ status: "verified" });
    this.closeEventConnection();

    return response.session;
  }

  getSession(): Promise<MrbdSession | null> {
    return Promise.resolve(readMrbdSession(this.storage, this.storageKey));
  }

  async refreshSession(): Promise<MrbdSession | null> {
    const session = await this.getSession();
    if (!session?.refreshToken) return null;

    const response = await this.request<RefreshSessionResponse>("/v1/session/refresh", {
      method: "POST",
      body: {
        appId: this.appId,
        refreshToken: session.refreshToken,
      },
    });

    this.storeSession(response.session);
    return response.session;
  }

  async signOut(): Promise<void> {
    const session = await this.getSession();

    if (session) {
      await this.request<unknown>("/v1/session/revoke", {
        method: "POST",
        body: {
          appId: this.appId,
          refreshToken: session.refreshToken,
          accessToken: session.accessToken,
        },
        ignoreServerErrors: true,
      });
    }

    removeMrbdSession(this.storage, this.storageKey);
    this.emitAuthState(null);
  }

  onAuthStateChange(callback: MrbdAuthStateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => {
      this.stateCallbacks.delete(callback);
    };
  }

  close(): void {
    this.closeEventConnection();
  }

  private requireActiveRequest(): ActiveAuthRequest {
    if (!this.activeRequest) {
      throw new MrbdAuthError(
        "request_unavailable",
        "Call startSignIn() before continuing the MRBD auth flow.",
      );
    }

    return this.activeRequest;
  }

  private updateActiveRequest(update: Partial<Pick<ActiveAuthRequest, "status" | "email">>): void {
    if (!this.activeRequest) return;
    this.activeRequest = { ...this.activeRequest, ...update };
  }

  private storeSession(session: MrbdSession): void {
    writeMrbdSession(this.storage, this.storageKey, session);
    this.emitAuthState(session);
  }

  private emitAuthState(session: MrbdSession | null): void {
    for (const callback of this.stateCallbacks) {
      callback(session);
    }
  }

  private connectEvents(stream: MrbdAuthEventStream | undefined, onEvent?: (event: MrbdAuthEvent) => void): void {
    this.closeEventConnection();
    if (!stream) return;

    const handleEvent = (event: MrbdAuthEvent) => {
      if (event.type === "email_submitted") {
        this.updateActiveRequest({ status: "email_submitted", email: event.email });
      } else if (event.type !== "error") {
        this.updateActiveRequest({ status: event.type });
      } else {
        this.updateActiveRequest({ status: "error" });
      }

      onEvent?.(event);
    };

    if (stream.type === "sse") {
      this.eventConnection = this.connectSse(stream.url, handleEvent);
      return;
    }

    this.eventConnection = this.connectWebSocket(stream.url, handleEvent);
  }

  private connectSse(url: string, onEvent: (event: MrbdAuthEvent) => void): EventConnection {
    if (!this.EventSourceCtor) {
      throw new MrbdAuthError("event_stream_unavailable", "EventSource is not available.");
    }

    const eventSource = new this.EventSourceCtor(url);
    eventSource.onmessage = (message) => {
      onEvent(parseAuthEvent(message.data));
    };
    eventSource.onerror = () => {
      onEvent({ type: "error", code: "event_stream_error", message: "MRBD auth event stream failed." });
    };

    return eventSource;
  }

  private connectWebSocket(url: string, onEvent: (event: MrbdAuthEvent) => void): EventConnection {
    if (!this.WebSocketCtor) {
      throw new MrbdAuthError("event_stream_unavailable", "WebSocket is not available.");
    }

    const webSocket = new this.WebSocketCtor(url);
    webSocket.onmessage = (message) => {
      if (typeof message.data !== "string") return;
      onEvent(parseAuthEvent(message.data));
    };
    webSocket.onerror = () => {
      onEvent({ type: "error", code: "event_stream_error", message: "MRBD auth WebSocket failed." });
    };

    return {
      close: () => webSocket.close(),
    };
  }

  private closeEventConnection(): void {
    this.eventConnection?.close();
    this.eventConnection = null;
  }

  private async request<T>(
    path: string,
    options: { method: "POST"; body: unknown; ignoreServerErrors?: boolean },
  ): Promise<T> {
    let response: Response;

    try {
      response = await this.fetcher(endpoint(this.authUrl, path), {
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(options.body),
      });
    } catch (error) {
      throw new MrbdAuthError("network_error", "Unable to reach the MRBD auth service.", {
        details: error,
      });
    }

    const data = await readJsonResponse(response);

    if (!response.ok) {
      if (options.ignoreServerErrors) return data as T;

      throw new MrbdAuthError("server_error", getServerErrorMessage(data), {
        status: response.status,
        details: data,
      });
    }

    return data as T;
  }
}

export function createMrbdAuth(config: MrbdAuthConfig): MrbdAuthClient {
  return new MrbdAuthClient(config);
}

function normalizeAuthUrl(authUrl: string): string {
  return authUrl.replace(/\/+$/, "");
}

function endpoint(authUrl: string, path: string): string {
  return `${authUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function toPublicRequest(request: ActiveAuthRequest): MrbdAuthRequest {
  const { deviceSecret: _deviceSecret, ...publicRequest } = request;
  return publicRequest;
}

function parseAuthEvent(data: string): MrbdAuthEvent {
  return JSON.parse(data) as MrbdAuthEvent;
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

function getServerErrorMessage(data: unknown): string {
  if (typeof data === "object" && data && "message" in data && typeof data.message === "string") {
    return data.message;
  }

  return "The MRBD auth service rejected the request.";
}
