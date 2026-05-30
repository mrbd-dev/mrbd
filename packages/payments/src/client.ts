import { MrbdPaymentsError, type MrbdPaymentsErrorCode } from "./error.js";
import type {
  MrbdAuthLike,
  MrbdEntitlement,
  MrbdPaymentsConfig,
  MrbdProduct,
  MrbdPurchaseResult,
  MrbdSubscribeResult,
  MrbdTokenProvider,
  MrbdWallet,
} from "./types.js";

const DEFAULT_PAYMENTS_URL = "https://payments.mrbd.io";

export class MrbdPaymentsClient {
  readonly appId: string;
  readonly paymentsUrl: string;

  private readonly tokenProvider: MrbdTokenProvider;
  private readonly fetcher: typeof fetch;

  constructor(config: MrbdPaymentsConfig) {
    if (!config.appId.trim()) {
      throw new MrbdPaymentsError("invalid_config", "MRBD payments requires a non-empty appId.");
    }

    this.appId = config.appId;
    this.paymentsUrl = normalizeUrl(config.paymentsUrl ?? DEFAULT_PAYMENTS_URL);
    this.tokenProvider = config.tokenProvider;

    const resolvedFetch = config.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!resolvedFetch) {
      throw new MrbdPaymentsError("browser_api_unavailable", "MRBD payments requires fetch.");
    }
    this.fetcher = resolvedFetch;
  }

  /** Lists the active products (with prices) offered by this app. */
  async listProducts(): Promise<MrbdProduct[]> {
    const result = await this.request<{ products: MrbdProduct[] }>("GET", "/v1/products");
    return result.products;
  }

  /** Reads the user's wallet: saved payment methods and whether a PIN is set. */
  async getWallet(): Promise<MrbdWallet> {
    return this.request<MrbdWallet>("GET", "/v1/wallet");
  }

  /**
   * Starts wallet setup. Returns a hosted URL to open on the phone (via the
   * pairing handoff) where the user securely saves a card to their MRBD wallet.
   */
  async startWalletSetup(options: { returnPath?: string } = {}): Promise<{ url: string }> {
    return this.request<{ url: string }>("POST", "/v1/wallet/setup", {
      body: options.returnPath ? { returnPath: options.returnPath } : {},
    });
  }

  /** Sets (or replaces) the user's purchase PIN. Requires a saved payment method. */
  async setPin(pin: string): Promise<void> {
    await this.request<{ ok: true }>("POST", "/v1/pin", { body: { pin } });
  }

  /** Verifies a PIN without making a purchase (e.g. to confirm before checkout UI). */
  async verifyPin(pin: string): Promise<boolean> {
    try {
      await this.request<{ ok: true }>("POST", "/v1/pin/verify", { body: { pin } });
      return true;
    } catch (error) {
      if (error instanceof MrbdPaymentsError && error.code === "pin_invalid") return false;
      throw error;
    }
  }

  /**
   * Returns a hosted Checkout URL to open on the phone. Use for the first
   * purchase (card entry) or when an off-session {@link purchase} needs SCA.
   */
  async checkout(priceId: string): Promise<{ url: string }> {
    return this.request<{ url: string }>("POST", "/v1/checkout", { body: { priceId } });
  }

  /** Off-session one-time purchase against the saved card, authorized by the PIN. */
  async purchase(priceId: string, options: { pin: string }): Promise<MrbdPurchaseResult> {
    return this.request<MrbdPurchaseResult>("POST", "/v1/purchases", {
      body: { priceId, pin: options.pin },
    });
  }

  /** Off-session subscription against the saved card, authorized by the PIN. */
  async subscribe(priceId: string, options: { pin: string }): Promise<MrbdSubscribeResult> {
    return this.request<MrbdSubscribeResult>("POST", "/v1/subscriptions", {
      body: { priceId, pin: options.pin },
    });
  }

  /** Cancels a subscription at the end of the current billing period. */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.request<{ ok: true }>(
      "POST",
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    );
  }

  /** Lists the user's active entitlements for this app. */
  async listEntitlements(): Promise<MrbdEntitlement[]> {
    const result = await this.request<{ entitlements: MrbdEntitlement[] }>("GET", "/v1/entitlements");
    return result.entitlements;
  }

  /** Authoritative check for whether the user currently owns a product. */
  async hasPurchased(productId: string): Promise<boolean> {
    const result = await this.request<{ productId: string; active: boolean }>(
      "GET",
      `/v1/entitlements/${encodeURIComponent(productId)}`,
    );
    return result.active;
  }

  // --- Internal request plumbing -------------------------------------------

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    options: { body?: unknown } = {},
  ): Promise<T> {
    const url = `${this.paymentsUrl}${path.startsWith("/") ? path : `/${path}`}`;

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
        throw new MrbdPaymentsError("network_error", "Unable to reach the MRBD payments service.", {
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
      throw new MrbdPaymentsError(mapErrorCode(data, response.status), getErrorMessage(data), {
        status: response.status,
        details: data,
      });
    }

    return data as T;
  }
}

export function createMrbdPayments(config: MrbdPaymentsConfig): MrbdPaymentsClient {
  return new MrbdPaymentsClient(config);
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
  return "The MRBD payments service rejected the request.";
}

function mapErrorCode(data: unknown, status: number): MrbdPaymentsErrorCode {
  if (typeof data === "object" && data && "code" in data && typeof data.code === "string") {
    const code = data.code;
    switch (code) {
      case "invalid_request":
      case "invalid_token":
      case "forbidden":
      case "not_found":
      case "conflict":
      case "rate_limited":
      case "pin_required":
      case "pin_invalid":
      case "pin_locked":
      case "payment_method_required":
      case "requires_action":
      case "onboarding_incomplete":
        return code;
      default:
        break;
    }
  }
  if (status === 401) return "invalid_token";
  if (status === 404) return "not_found";
  return "server_error";
}
