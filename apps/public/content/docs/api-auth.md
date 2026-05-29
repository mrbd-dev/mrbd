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

## React

`@mrbd/auth/react` provides ready-made components for React apps (React 18+):

```tsx
import { MrbdAuthProvider, MrbdAuthGate, useMrbdAuth } from "@mrbd/auth/react";

<MrbdAuthProvider appId="com.example.my-app">
  <MrbdAuthGate>
    <SignedInApp />
  </MrbdAuthGate>
</MrbdAuthProvider>;
```

- `MrbdAuthProvider` creates and shares the client and tracks session state.
- `MrbdAuthGate` shows the built-in `MrbdSignInScreen` when signed out and renders its children when signed in.
- `MrbdSignInScreen` displays the verification URL and code, then collects the email OTP.
- `MrbdOtpNumpad` is a 600x600, D-pad-navigable numeric pad used by the sign-in screen.
- `useMrbdAuth()` exposes `{ client, session, status, refresh, signOut }`.

`create-mrbd-app` scaffolds a working `app/sign-in/page.tsx` using these components.

## Sessions

- `getSession()` reads the stored session.
- `refreshSession()` refreshes the stored session when a refresh token is available.
- `signOut()` revokes the session through MRBD auth services and removes local storage.
- `onAuthStateChange(callback)` subscribes to local session changes.

By default, sessions are stored in `localStorage` under an app-specific key. Pass `storage: null` to disable persistence.

## Security model

The public package never talks directly to Supabase. It calls the private MRBD auth backend, which owns pairing, email OTP, Supabase integration, app registration, token exchange, rate limits, and audit logs.

Realtime pairing events are used for flow status and email handoff. Sensitive session credentials are fetched over HTTPS, not delivered over WebSocket or SSE.

## Legal requirements for your app

Because MRBD authenticates real people on your behalf, you have obligations to your end users. When you accept the MRBD Developer Terms in the portal, you also agree to the Privacy Policy and Data Processing Addendum, under which **you are the data controller** for your end users and **MRBD is your processor** for managed authentication.

What this means in practice:

- **A privacy policy is required.** When you register an app in the [developer portal](https://mrbd.io/portal/apps/new), you must either provide your own privacy policy URL or let MRBD host a generated one for your app. The pairing screen shows end users a link to your privacy policy (and MRBD's) before they submit their email.
- **A terms of service is optional.** Provide your own URL or opt into an MRBD-hosted generated version.
- **Keep your details accurate.** The publisher name and legal contact email you register are used to fill any MRBD-generated documents and are surfaced to end users for data requests.

MRBD-hosted documents live at `https://mrbd.io/legal/app/<app-id>/privacy` (and `/terms`). MRBD's own policies are at [mrbd.io/legal](https://mrbd.io/legal).
