---
title: "API: @mrbd/payments"
description: "Sell purchases and subscriptions in MRBD apps with Stripe Connect."
order: 13.5
---
# API: @mrbd/payments

Install:

```bash
npm install @mrbd/payments @mrbd/auth
```

`@mrbd/payments` lets your glasses app charge for one-time purchases and subscriptions without running a payments backend. MRBD operates a single Stripe platform account; you onboard a connected account in the [developer portal](/portal/payments) and are the merchant of record for your own sales.

The key idea: the **customer and saved payment methods live on the MRBD platform account**, keyed to the signed-in user's MRBD auth id. So a user adds a card once and can buy from **any** MRBD app with just a PIN — no re-entering card details on the glasses.

## Create a client

```ts
import { createMrbdAuth } from "@mrbd/auth";
import { createMrbdPayments, tokenProviderFromAuth } from "@mrbd/payments";

const auth = createMrbdAuth({ appId: "com.example.app" });

const payments = createMrbdPayments({
  appId: "com.example.app",
  tokenProvider: tokenProviderFromAuth(auth),
});
```

`tokenProviderFromAuth` wires the stored session's access token and refreshes it on expiry. The payments service verifies that token and derives the calling app and user from it — clients never hold Stripe or Supabase credentials.

## Products and entitlements

List what your app sells, and check what the user already owns. Entitlements are authoritative (granted only from verified Stripe webhooks), so they are safe to gate features on.

```ts
const products = await payments.listProducts();
const owned = await payments.hasPurchased(products[0].id);
```

## The purchase flow

Card entry happens once on the phone via Stripe's hosted, PCI-compliant page; every later purchase is confirmed on the glasses with a PIN.

```ts
const wallet = await payments.getWallet();
if (!wallet.hasPaymentMethod) {
  const { url } = await payments.startWalletSetup(); // open this URL on the phone
}

// First-time buyers set a PIN; returning buyers just enter it.
if (!wallet.hasPin) await payments.setPin("1234");

// One-time purchase and subscription, authorized by the PIN:
await payments.purchase(priceId, { pin: "1234" });
await payments.subscribe(priceId, { pin: "1234" });

await payments.cancelSubscription(subscriptionId);
```

If Stripe requires extra verification (SCA), `purchase` returns `requiresAction: true`; fall back to `payments.checkout(priceId)` and open the returned URL on the phone.

## React

`@mrbd/payments/react` ships glasses-friendly UI. `MrbdPaywall` orchestrates the whole flow — wallet setup handoff, PIN entry, off-session charge, and the SCA fallback — and renders its children once the user owns the product.

```tsx
import { MrbdPaywall } from "@mrbd/payments/react";

<MrbdPaywall client={payments} productId={product.id} price={product.prices[0]}>
  <PremiumScreen />
</MrbdPaywall>;
```

Lower-level components are also exported: `MrbdPinPad` (a D-pad numeric pad like the auth OTP pad), `MrbdBuyButton`, and `MrbdWalletSetupHandoff`.

## Server

Gate premium features on the server with the authoritative entitlement check. Never trust the client alone.

```ts
import { createMrbdPaymentsServer } from "@mrbd/payments/server";

const server = createMrbdPaymentsServer({ appId: "com.example.app" });
const allowed = await server.verifyEntitlement(accessToken, productId);
```

## Selling: the developer portal

Onboard your Stripe connected account and create products at [/portal/payments](/portal/payments). MRBD takes a platform fee on each sale and routes the rest to your account; you receive payouts and are the merchant of record.
