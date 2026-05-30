---
"@mrbd/payments": minor
---

Add `@mrbd/payments`: a client for MRBD's managed Stripe Connect payments. Includes the browser client (`createMrbdPayments`, `tokenProviderFromAuth`, products, shared wallet, PIN-authorized one-time purchases and subscriptions, and authoritative entitlements), glasses-friendly React UI (`MrbdPaywall`, `MrbdPinPad`, `MrbdBuyButton`, `MrbdWalletSetupHandoff`), and server helpers (`createMrbdPaymentsServer` with `verifyEntitlement`, plus `verifyMrbdWebhookSignature`).
