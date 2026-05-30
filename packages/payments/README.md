# @mrbd/payments

Client for adding payments to Meta Ray-Ban Display web apps, powered by MRBD's
managed Stripe Connect platform.

MRBD runs a single Stripe platform account. Developers onboard a connected
account (and are the merchant of record for their own sales), while the
customer and saved payment methods live on the platform account, keyed to the
end user's MRBD auth id. The upshot: a user adds a card once and can buy from
**any** MRBD app with just a PIN.

## Install

```bash
npm install @mrbd/payments @mrbd/auth
```

## Quick start

```ts
import { createMrbdAuth } from "@mrbd/auth";
import { createMrbdPayments, tokenProviderFromAuth } from "@mrbd/payments";

const auth = createMrbdAuth({ appId: "com.example.my-app" });
const payments = createMrbdPayments({
  appId: "com.example.my-app",
  tokenProvider: tokenProviderFromAuth(auth),
});

const products = await payments.listProducts();
const owned = await payments.hasPurchased(products[0].id);
```

## Purchase flow on the glasses

Card entry happens once on the phone (Stripe's hosted, PCI-compliant page);
every later purchase is confirmed on the glasses with a PIN.

```ts
const wallet = await payments.getWallet();
if (!wallet.hasPaymentMethod) {
  const { url } = await payments.startWalletSetup(); // open on phone
}

// Subsequent purchases (same or a different developer's app):
await payments.purchase(priceId, { pin: "1234" });
await payments.subscribe(priceId, { pin: "1234" });
```

## React

```tsx
import { MrbdPaywall } from "@mrbd/payments/react";

<MrbdPaywall client={payments} productId={product.id} price={product.prices[0]}>
  <PremiumFeature />
</MrbdPaywall>;
```

`MrbdPaywall` orchestrates the whole flow (wallet setup handoff, PIN entry,
off-session charge, and an SCA fallback to the phone). Lower-level components
`MrbdPinPad`, `MrbdBuyButton`, and `MrbdWalletSetupHandoff` are also exported.

## Server

```ts
import { createMrbdPaymentsServer } from "@mrbd/payments/server";

const server = createMrbdPaymentsServer({ appId: "com.example.my-app" });
const allowed = await server.verifyEntitlement(accessToken, productId);
```

`verifyEntitlement` is the authoritative server-side ownership check. Never
trust the client alone to gate premium features.
