# @mrbd/auth

Client helpers for adding MRBD-hosted auth to Meta Ray-Ban Display web apps.

This package is the public SDK only. It talks to MRBD-owned auth services over HTTPS plus SSE or WebSocket. It does not contain Supabase credentials, admin logic, token minting, OTP verification internals, or private infrastructure code.

## Install

```bash
npm install @mrbd/auth
```

## Usage

```ts
import { createMrbdAuth } from "@mrbd/auth";

const auth = createMrbdAuth({
  appId: "com.example.my-app",
});

const request = await auth.startSignIn({
  onEvent: (event) => {
    if (event.type === "email_submitted") {
      void auth.sendOtp(event.email);
    }
  },
});

console.log(`Go to ${request.verificationUrl} and enter ${request.userCode}`);
```

After the email has been submitted on the phone or computer, send the OTP from the glasses browser:

```ts
const session = await auth.verifyOtp("123456");
```

The resulting session belongs to the glasses browser. The phone or computer is only used as a keyboard proxy for email entry.

## Convenience flow

Apps that want to orchestrate the default flow can use `signInWithCode()`:

```ts
const session = await auth.signInWithCode({
  onRequest: (request) => {
    showCodeOnGlasses(request.verificationUrl, request.userCode);
  },
  getOtp: async () => {
    return showOtpNumpadOnGlasses();
  },
});
```

## Sessions

By default, sessions are stored in `localStorage` under an app-specific key. Pass `storage: null` to disable persistence or provide a custom storage object for tests.

```ts
const session = await auth.getSession();
const refreshed = await auth.refreshSession();
await auth.signOut();
```

## Security model

- The glasses app never talks directly to Supabase.
- The visible pairing code is not treated as the only secret.
- The SDK generates a high-entropy device secret and sends a SHA-256 challenge to the backend.
- Sensitive session credentials are fetched over HTTPS, not delivered over realtime events.
- The private MRBD auth backend owns pairing, rate limits, app registration, Supabase OTP, token exchange, and audit logging.
