---
title: API: @mrbd/auth
description: "Client helpers for MRBD-hosted auth flows."
order: 11
---
# API: @mrbd/auth

Install:

```bash
npm install @mrbd/auth
```

`@mrbd/auth` starts and completes a glasses-owned auth flow through MRBD-hosted auth services. The phone or computer is used only to enter the user's email at `mrbd.link`; the glasses browser initiates OTP, verifies OTP, and receives its own session.

## Create a client

```ts
import { createMrbdAuth } from "@mrbd/auth";

const auth = createMrbdAuth({
  appId: "com.example.my-app",
});
```

`appId` identifies the registered MRBD app. The private MRBD auth backend validates this ID, allowed origins, rate limits, pairing state, and Supabase auth integration.

## Start sign-in

```ts
const request = await auth.startSignIn({
  onEvent: (event) => {
    if (event.type === "email_submitted") {
      void auth.sendOtp(event.email);
    }
  },
});
```

Show `request.verificationUrl` and `request.userCode` on the glasses. The user opens the URL on a phone or computer, enters the code, and submits their email.

## Verify OTP

After the user receives the email OTP, collect it on the glasses and verify it:

```ts
const session = await auth.verifyOtp(otp);
```

The returned session belongs to the glasses browser. It is not copied from the phone or computer.

## Convenience flow

`signInWithCode()` orchestrates the default sequence while letting the app render its own glasses UI:

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

- `getSession()` reads the stored session.
- `refreshSession()` refreshes the stored session when a refresh token is available.
- `signOut()` revokes the session through MRBD auth services and removes local storage.
- `onAuthStateChange(callback)` subscribes to local session changes.

By default, sessions are stored in `localStorage` under an app-specific key. Pass `storage: null` to disable persistence.

## Security model

The public package never talks directly to Supabase. It calls the private MRBD auth backend, which owns pairing, email OTP, Supabase integration, app registration, token exchange, rate limits, and audit logs.

Realtime pairing events are used for flow status and email handoff. Sensitive session credentials are fetched over HTTPS, not delivered over WebSocket or SSE.
