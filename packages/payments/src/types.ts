/**
 * Supplies the app-scoped access token for payment requests, and optionally a
 * way to refresh it. Pair with `@mrbd/auth` via {@link tokenProviderFromAuth}.
 */
export type MrbdTokenProvider = {
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>;
  /** Called once on a 401 before the request is retried. */
  refresh?: () => Promise<unknown>;
};

export type MrbdPaymentsConfig = {
  /** Reverse-domain app id this client transacts for. */
  appId: string;
  /** MRBD payments service base URL. Defaults to the hosted service. */
  paymentsUrl?: string;
  tokenProvider: MrbdTokenProvider;
  fetch?: typeof fetch;
};

export type MrbdPriceKind = "one_time" | "recurring";

export type MrbdPrice = {
  /** Opaque price id passed back to checkout/purchase/subscribe. */
  id: string;
  kind: MrbdPriceKind;
  /** Amount in the currency's minor unit (e.g. cents). */
  unitAmount: number;
  currency: string;
  /** Billing cadence for recurring prices (null for one-time). */
  recurringInterval: string | null;
  intervalCount: number | null;
};

export type MrbdProduct = {
  /** Opaque product id used with {@link MrbdPaymentsClient.hasPurchased}. */
  id: string;
  name: string;
  description: string | null;
  prices: MrbdPrice[];
};

export type MrbdPaymentMethod = {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
};

export type MrbdWallet = {
  /** Whether the user has set a purchase PIN. */
  hasPin: boolean;
  /** Whether the user has at least one saved payment method. */
  hasPaymentMethod: boolean;
  paymentMethods: MrbdPaymentMethod[];
};

export type MrbdEntitlement = {
  productId: string;
  source: "purchase" | "subscription";
  /** ISO timestamp the entitlement lapses, or null when perpetual. */
  expiresAt: string | null;
};

export type MrbdPurchaseResult = {
  status: string;
  /**
   * True when Stripe requires the purchase to be confirmed on the phone (SCA).
   * Hand off to {@link MrbdPaymentsClient.checkout} or the returned clientSecret.
   */
  requiresAction: boolean;
  clientSecret: string | null;
};

export type MrbdSubscribeResult = {
  status: string;
  subscriptionId: string;
};

/**
 * Minimal shape of an `@mrbd/auth` client, used by {@link tokenProviderFromAuth}
 * without taking a hard dependency on the auth package.
 */
export type MrbdAuthLike = {
  getSession: () => Promise<{ accessToken: string } | null>;
  refreshSession?: () => Promise<{ accessToken: string } | null>;
};
