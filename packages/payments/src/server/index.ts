import { MrbdPaymentsError } from "../error.js";
import type { MrbdEntitlement } from "../types.js";

const DEFAULT_PAYMENTS_URL = "https://payments.mrbd.io";

export type MrbdPaymentsServerConfig = {
  /** The appId this backend serves. */
  appId: string;
  /** MRBD payments service base URL. Defaults to the hosted service. */
  paymentsUrl?: string;
  fetch?: typeof fetch;
};

export interface MrbdPaymentsServer {
  /**
   * Authoritative server-side check that the bearer of `accessToken` owns
   * `productId`. The payments service verifies the token and consults the
   * entitlements table, so this is safe to trust for gating premium features.
   */
  verifyEntitlement(accessToken: string, productId: string): Promise<boolean>;
  /** Lists the token holder's active entitlements for this app. */
  listEntitlements(accessToken: string): Promise<MrbdEntitlement[]>;
}

export function createMrbdPaymentsServer(config: MrbdPaymentsServerConfig): MrbdPaymentsServer {
  if (!config.appId.trim()) {
    throw new MrbdPaymentsError("invalid_config", "MRBD payments requires a non-empty appId.");
  }
  const baseUrl = (config.paymentsUrl ?? DEFAULT_PAYMENTS_URL).replace(/\/+$/, "");
  const fetcher = config.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetcher) {
    throw new MrbdPaymentsError("browser_api_unavailable", "MRBD payments requires fetch.");
  }

  const request = async <T>(accessToken: string, path: string): Promise<T> => {
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}${path}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-mrbd-app-id": config.appId,
        },
      });
    } catch (error) {
      throw new MrbdPaymentsError("network_error", "Unable to reach the MRBD payments service.", {
        details: error,
      });
    }
    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;
    if (!response.ok) {
      const message =
        typeof data === "object" && data && "message" in data && typeof data.message === "string"
          ? data.message
          : "The MRBD payments service rejected the request.";
      throw new MrbdPaymentsError(response.status === 401 ? "invalid_token" : "server_error", message, {
        status: response.status,
        details: data,
      });
    }
    return data as T;
  };

  return {
    async verifyEntitlement(accessToken, productId) {
      const result = await request<{ productId: string; active: boolean }>(
        accessToken,
        `/v1/entitlements/${encodeURIComponent(productId)}`,
      );
      return result.active;
    },
    async listEntitlements(accessToken) {
      const result = await request<{ entitlements: MrbdEntitlement[] }>(accessToken, "/v1/entitlements");
      return result.entitlements;
    },
  };
}

/**
 * Verifies an HMAC-SHA256 signature over a raw webhook payload, for developers
 * who have MRBD forward payment events to their own backend with a shared
 * secret. Uses Web Crypto, so it runs on Node 18+ and edge runtimes alike.
 *
 * Stripe events delivered directly to MRBD are verified inside the payments
 * service with the Stripe signing secret; this helper is for the MRBD -> app
 * relay only.
 */
export async function verifyMrbdWebhookSignature(args: {
  payload: string;
  signature: string;
  secret: string;
}): Promise<boolean> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new MrbdPaymentsError("browser_api_unavailable", "Web Crypto is required to verify signatures.");
  }
  const encoder = new TextEncoder();
  const key = await subtle.importKey(
    "raw",
    encoder.encode(args.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await subtle.sign("HMAC", key, encoder.encode(args.payload));
  const expected = toHex(new Uint8Array(digest));
  return timingSafeEqualHex(expected, args.signature.trim().toLowerCase());
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
