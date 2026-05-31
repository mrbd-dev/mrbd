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

Register an app (and add the origins it is served from) in the [developer portal](https://mrbd.dev/portal) or from the command line with `mrbd apps create` — see [Developer Account (CLI)](/docs/developer-cli).

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

## Direct email sign-in (web and phone)

The flow above is designed for the glasses, which have no keyboard — the phone or computer at `mrbd.link` is only used to type the email. On a surface that *does* have a keyboard (a phone web app, or a desktop companion app), you can skip device pairing entirely and run a straight email-OTP flow:

```ts
await auth.sendEmailOtp("user@example.com");
// collect the 6-digit code the user received by email
const session = await auth.verifyEmailOtp(otp);
```

`sendEmailOtp(email)` asks MRBD to email a one-time code, and `verifyEmailOtp(token)` exchanges it for a session. The session is bound to the same `appId` and the same MRBD user as the glasses, so a user who signs in on their phone shares one identity (and one set of managed data) with the glasses app. As with the glasses flow, the session belongs to whichever browser completed it; nothing is copied between devices.

Use the glasses pairing flow (`startSignIn` / `signInWithCode`) on the glasses, and the direct email flow (`sendEmailOtp` / `verifyEmailOtp`) on keyboard surfaces.

## Approve a new device from a signed-in one

If a user is already signed in on one device (say their phone), they can sign in a second device (their glasses) without entering a second OTP. The new device starts the normal pairing flow and shows its code; the signed-in device approves that code:

```ts
// On the already signed-in device (e.g. the phone):
await auth.approveDevice(userCode); // the code shown on the new device
```

The new device, which is waiting in `startSignIn`, automatically receives an `approved` event and claims its own session — its own access and refresh tokens, independently revocable. Nothing is copied between devices; the approving device only authorizes the grant with its own access token. The new device still proves possession of the device secret it generated, so the visible code alone can never produce a session.

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
- `MrbdAuthGate` shows the built-in `MrbdSignInScreen` when signed out and renders its children when signed in. Pass a custom `fallback` to use a different sign-in UI.
- `MrbdSignInScreen` (glasses) displays the verification URL and code, then collects the email OTP.
- `MrbdEmailSignInScreen` (web/phone) collects the user's email and the one-time code directly, using the `sendEmailOtp` / `verifyEmailOtp` flow. Use it as the gate `fallback` on keyboard surfaces.
- `MrbdApproveDeviceScreen` (signed-in surface) collects the code shown on another device and calls `approveDevice` so that device can sign in without its own OTP.
- `MrbdOtpNumpad` is a 600x600, D-pad-navigable numeric pad used by the sign-in screens.
- `useMrbdAuth()` exposes `{ client, session, status, refresh, signOut }`.

`create-mrbd-app` scaffolds a working `app/sign-in/page.tsx` using these components — the glasses view uses `MrbdSignInScreen` and the web view uses `MrbdEmailSignInScreen`.

## Sessions

- `getSession()` reads the stored session.
- `refreshSession()` refreshes the stored session when a refresh token is available.
- `signOut()` revokes the session through MRBD auth services and removes local storage.
- `onAuthStateChange(callback)` subscribes to local session changes.

By default, sessions are stored in `localStorage` under an app-specific key. Pass `storage: null` to disable persistence.

## Verify sessions on your backend

The session's `accessToken` is an MRBD-signed JWT scoped to your app: its audience (`aud`) is your `appId`, and its subject (`sub`) is the user id. A token minted through another app will not verify against your `appId`, so you can trust it as proof of a signed-in user for *your* app specifically.

Verify it on your server with `@mrbd/auth/server`, which checks the signature against MRBD's published keys (`/.well-known/jwks.json`) and enforces the audience:

```ts
import { createMrbdTokenVerifier } from "@mrbd/auth/server";

// Create once and reuse so the public keys stay cached.
const verifier = createMrbdTokenVerifier({ appId: "com.example.my-app" });

// In a request handler:
const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
const { userId, email, scope } = await verifier.verify(token);
```

`verify()` throws an `MrbdAuthError` (code `invalid_session`) when the token is missing, expired, signed by an unknown key, or was issued for a different app. Never trust the `userId`/`appId` fields of the stored session object without verifying the token — those are only labels until the JWT is checked.

The refresh token returned in the session is an opaque, app-bound MRBD token; the underlying Supabase session is never exposed to clients. Refreshing or revoking always goes through the MRBD auth backend.

## Security model

The public package never talks directly to Supabase. It calls the private MRBD auth backend, which owns pairing, email OTP, Supabase integration, app registration, token issuance, rate limits, and audit logs.

Access tokens are app-scoped JWTs signed by MRBD (audience = your `appId`); the backend never returns raw Supabase tokens to clients. Each registered app must declare its allowed origins, and the backend rejects auth flows from any other origin.

Realtime pairing events are used for flow status and email handoff. Sensitive session credentials are fetched over HTTPS, not delivered over WebSocket or SSE.

## Legal requirements for your app

Because MRBD authenticates real people on your behalf, you have obligations to your end users. When you accept the MRBD Developer Terms in the portal, you also agree to the Privacy Policy and Data Processing Addendum, under which **you are the data controller** for your end users and **MRBD is your processor** for managed authentication.

What this means in practice:

- **A privacy policy is required.** When you register an app in the [developer portal](https://mrbd.io/portal/apps/new), you must either provide your own privacy policy URL or let MRBD host a generated one for your app. The pairing screen shows end users a link to your privacy policy (and MRBD's) before they submit their email.
- **A terms of service is optional.** Provide your own URL or opt into an MRBD-hosted generated version.
- **Keep your details accurate.** The publisher name and legal contact email you register are used to fill any MRBD-generated documents and are surfaced to end users for data requests.

MRBD-hosted documents live at `https://mrbd.io/legal/app/<app-id>/privacy` (and `/terms`). MRBD's own policies are at [mrbd.io/legal](https://mrbd.io/legal).
