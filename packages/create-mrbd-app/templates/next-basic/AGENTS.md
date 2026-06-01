# AGENTS.md — __MRBD_APP_TITLE__

Guidance for AI coding agents working in this repo. This is a **Meta Ray-Ban Display** web app: a Next.js (App Router) + TypeScript + Tailwind + shadcn/ui project that renders on the glasses' built-in browser and is driven by a D-pad (Arrow keys + Enter), not touch.

## Two audiences, one app

The same URL serves two different experiences, chosen on the server per request:

- **On the glasses** — the focused 600x600 D-pad app (`components/glasses-home.tsx`).
- **On a phone or computer** — an ordinary, responsive, scrollable website (`components/web-home.tsx`).

Detection lives in `lib/mrbd-device.ts`: `isOnMetaRayBanDisplay()` reads the request headers (via `next/headers`) and calls `isMetaRayBanDisplayRequest()` from `@mrbd/core`, which checks the `x-requested-with` header the glasses browser sends. `app/page.tsx` is a Server Component that branches on this, and `app/layout.tsx` only applies the 600x600 lock (the `mrbd-glasses` class + the fixed `viewport`) when the request is from the glasses.

When you add app functionality, decide whether it belongs in the glasses view, the web view, or both. The 600x600 / D-pad rules below apply to the **glasses** experience; the web view is a normal responsive site with no such constraints.

## The display target (read this first)

The glasses are not a phone. Every UI decision must respect these hard constraints:

- **Fixed 600 x 600 viewport.** `html`/`body` are locked to 600x600 with `overflow: hidden` (see `app/globals.css`). Do not add scrolling layouts, fluid breakpoints, or assume a larger screen. Design the whole UI to fit in one 600x600 square.
- **Dark, additive rendering.** The display is transparent/additive, so backgrounds are near-black (`#0a0a0f` / `#000000`) and content is light. Avoid large bright fills and low-contrast text. Keep it high-contrast on dark.
- **D-pad navigation only.** There is no pointer. The user moves focus with Arrow keys and activates with Enter. Every interactive element must be focusable and reachable in a sensible order. Use the focus styles already defined for `.mrbd-focusable` / `.focusable` (cyan glow + scale).
- **Glanceable.** Large type, few elements per screen, short labels.

## Project layout

```
app/
  layout.tsx        Root layout — conditional viewport + mrbd-glasses class, metadata/manifest
  page.tsx          Server entry — renders GlassesHome on glasses, WebHome elsewhere
  sign-in/page.tsx  Server entry — renders GlassesSignIn on glasses, WebSignIn elsewhere
  globals.css       glasses-only 600x600 lock, theme tokens, focus styles
components/
  glasses-home.tsx  The 600x600 D-pad app (sensor + location demo, links to /sign-in)
  web-home.tsx      The responsive landing page for phones/computers
  glasses-sign-in.tsx  Auth demo on glasses (600x600 D-pad pairing flow)
  web-sign-in.tsx      Auth demo on phone/computer (same flow, responsive layout)
  ui/               shadcn/ui primitives (button, card)
lib/
  mrbd-device.ts    isOnMetaRayBanDisplay() — server-side glasses detection
  mrbd-app.ts       MRBD_APP_ID — shared app id for both sign-in views
  utils.ts          cn() helper (clsx + tailwind-merge)
public/             manifest.webmanifest, icons
```

Path alias: `@/*` maps to the project root (e.g. `@/components/ui/card`, `@/lib/utils`).

## The mrbd packages

This app depends on three first-party packages. Prefer these over reimplementing platform behavior:

- **`@mrbd/core`** — non-React device APIs. Sensors and location, e.g. `requestAndStartMrbdSensors({ onOrientation, onMotion })` and `getCurrentMrbdPosition()`. These return result objects with an `ok` boolean — always check `result.ok` before reading data, and call `.stop()` on a sensor session when the component unmounts (see `app/page.tsx`).
- **`@mrbd/react`** — React UI + interaction layer. Use `MrbdViewport` as the outer wrapper (renders the 600x600 frame), `MrbdButton` for D-pad-focusable buttons, and the `useDpadNavigation()` hook on any screen that needs Arrow-key focus movement. Reach for these instead of raw `<button>`/`<div>` so navigation and focus styling stay consistent.
- **`@mrbd/auth`** — authentication. Import the React entrypoint from `@mrbd/auth/react`.

When adding a new screen, the standard shell is:

```tsx
"use client";
import { MrbdButton, MrbdViewport, useDpadNavigation } from "@mrbd/react";

export default function Screen() {
  useDpadNavigation();
  return (
    <MrbdViewport className="text-white">
      {/* one 600x600 screen of content */}
    </MrbdViewport>
  );
}
```

Components that use mrbd hooks/APIs must be Client Components (`"use client"`).

## Authentication (`@mrbd/auth`)

Auth uses an **MRBD-hosted device-pairing flow** — there is no password form on the glasses. The glasses display a short code; the user enters that code plus their email on their phone at `mrbd.link`; the glasses then receive their own session. The `/sign-in` route demos this on both targets: `app/sign-in/page.tsx` is a Server Component that renders `components/glasses-sign-in.tsx` (the 600x600 D-pad version) on the glasses and `components/web-sign-in.tsx` (the same flow in a responsive centered layout) on phones/computers. Both wrap the same `MrbdAuthProvider` and read the shared `MRBD_APP_ID` from `lib/mrbd-app.ts`.

The pattern is provider + gate + hook:

```tsx
import { MrbdAuthProvider, MrbdAuthGate, useMrbdAuth } from "@mrbd/auth/react";

<MrbdAuthProvider appId={MRBD_APP_ID}>
  <MrbdAuthGate>
    {/* only rendered once signed in */}
  </MrbdAuthGate>
</MrbdAuthProvider>;
```

- `MrbdAuthProvider` — wrap any authed area; requires a real `appId`.
- `MrbdAuthGate` — renders the pairing-code UI until the user is signed in, then renders its children.
- `useMrbdAuth()` — read `session` (e.g. `session.userId`) and call `signOut()` from inside the provider.

**`appId` setup (required for real auth):** the placeholder `MRBD_APP_ID` in `lib/mrbd-app.ts` (`__MRBD_APP_ID__`) is not a registered app. To make sign-in actually work:

1. Register the app — either at https://mrbd.dev/portal/apps/new, or from the CLI:

   ```bash
   npx mrbd-cli login                       # sign in to your developer account
   npx mrbd-cli apps create \
     --app-id com.example.my-app \
     --name "__MRBD_APP_TITLE__" \
     --origin https://<your-app-origin> \
     --privacy-policy-url https://<your-app-origin>/privacy
   ```

2. Add the origin(s) the app is served from (tunnel URL and/or production URL) to the app's allow-list — auth is rejected from non-allow-listed origins. From the CLI, edit origins with `npx mrbd-cli apps update <appId> --origin <url>` (repeat `--origin` for multiple).
3. Replace `MRBD_APP_ID` with the registered app ID.

See the CLI command reference below for `login`, `apps list`, `apps get`, and `apps update`.

If asked to "add auth" to another screen, reuse this provider/gate/hook pattern and the same `appId` rather than introducing a different auth system.

### Customizing the sign-in UI

The built-in screens are a starting point, not a requirement — keep the MRBD `@mrbd/auth` backend (the same session powers `@mrbd/data`/`@mrbd/storage`), but make the UI match this app:

- **Re-theme** the built-in screens by passing a `theme` to `MrbdAuthProvider` (or to an individual screen): override tokens like `colorBackground`, `colorPrimary`, `colorPrimaryText`, `colorAccent`, `colorBorder`, `radiusMedium`, and `fontFamily`. See `MrbdAuthTheme`.
- **Roll your own UI** with the headless hooks for full control of the markup: `useMrbdEmailSignIn()` (keyboard/web), `useMrbdDeviceSignIn()` (glasses pairing), and `useMrbdApproveDevice()`. Render your own screens per `phase` and pass them as the gate `fallback` (`<MrbdAuthGate fallback={<MyCustomSignIn />}>`). Keep everything inside the 600x600 D-pad shell on the glasses.

Do this when the app wants a branded or polished sign-in; don't introduce a different auth provider.

## Commands

```bash
npm install
npm run dev          # local dev server
npm run mrbd:start   # public HTTPS tunnel for on-glasses testing (mrbd-cli)
npm run build        # production build
npm run lint         # next lint
```

### Local testing

In a normal browser you'll see the **web** view (`WebHome`) — that's expected, since `localhost` isn't the glasses browser. To validate the **glasses** view locally, render `GlassesHome` directly (e.g. temporarily), or use `npm run mrbd:start` and open the tunnel on real glasses. Test the glasses experience in Chrome DevTools at a **600 x 600** viewport and navigate with Arrow keys + Enter — do not rely on mouse clicks, the device has no pointer.

### Testing on real glasses

`npm run mrbd:start` (from `mrbd-cli`) starts the dev server if needed, then exposes it via a short-lived `https://<slug>.mrbd.host` tunnel and prints a QR code. In the Meta AI app with Developer Mode on: App Settings > App Connections > Web Apps > Add a Web App, then enter the tunnel URL. HTTPS is required (sensors, location, and auth will not work over plain HTTP). Stop with `Ctrl+C`.

### Developer account & auth apps (CLI)

`mrbd-cli` can also sign in to your developer account and manage the auth apps used by `@mrbd/auth` — the same apps shown in the portal. Use this to register the `appId` referenced in `lib/mrbd-app.ts` and to keep its allowed origins up to date.

```bash
npx mrbd-cli login                 # email OTP; session saved to ~/.mrbd/credentials.json
npx mrbd-cli whoami
npx mrbd-cli apps list
npx mrbd-cli apps get <appId>
npx mrbd-cli apps create --app-id <id> --name "<name>" --origin <url> --privacy-policy-url <url>
npx mrbd-cli apps update <appId> --origin <url>   # only the fields you pass change
npx mrbd-cli logout
```

A privacy policy is required when creating an app (pass `--privacy-policy-url`, or `--generate-privacy` with `--publisher-name` and `--legal-email`).

## Conventions & guardrails for agents

- **Keep everything inside one 600x600 screen.** Never introduce page scrolling or assume more space. If content grows, split into multiple D-pad-navigable screens/routes.
- **Use the mrbd components/hooks** (`MrbdViewport`, `MrbdButton`, `useDpadNavigation`) for any interactive UI so focus + navigation stay correct. New focusable elements need the `.focusable`/`.mrbd-focusable` class to get the standard focus ring.
- **Check `result.ok`** before using sensor/location data from `@mrbd/core`, and always clean up sensor sessions on unmount.
- **Don't hardcode secrets.** The `appId` is a public client identifier and is fine to commit; anything sensitive belongs in env vars, not source.
- **Match the existing visual language**: dark `#0a0a0f` cards, rounded corners (~24-28px), bold uppercase tracking for labels, cyan (`#00d4ff` / `cyan-300`) accents.
- **Styling** is Tailwind + the `cn()` helper in `lib/utils.ts`; add shadcn/ui primitives under `components/ui/`.
- After edits, run `npm run lint` and `npm run build` to confirm the app still compiles.
