# __MRBD_APP_TITLE__

A Meta Ray-Ban Display web app built with Next.js, Tailwind CSS, shadcn/ui, `@mrbd/core`, `@mrbd/react`, and `@mrbd/auth`.

## One URL, two experiences

The same address adapts to who's visiting, decided on the server per request:

- **On Meta Ray-Ban Display glasses** — the focused 600 x 600, D-pad-driven app (`components/glasses-home.tsx`).
- **On a phone or computer** — a normal, responsive landing page (`components/web-home.tsx`).

The switch happens in `app/page.tsx` using `isOnMetaRayBanDisplay()` (`lib/mrbd-device.ts`), which inspects the request headers the glasses browser sends. So when you share the link, regular visitors get an ordinary website and the glasses get the real app.

## Develop

```bash
npm install
npm run dev
```

Visiting `localhost` in a normal browser shows the **web** view. To preview the **glasses** view, use a 600 x 600 viewport in Chrome DevTools (navigate with Arrow keys and Enter) or open the app on real glasses via `npm run mrbd:start`.

## Test On Glasses

This project includes `mrbd-cli` so you can expose your local dev server through a short-lived public HTTPS tunnel:

```bash
npm run mrbd:start
```

The command starts `npm run dev` when needed, prints a `https://<slug>.mrbd.host` URL, and shows a terminal QR code. Add that URL in the Meta AI app with Developer Mode enabled:

1. App Settings > App Connections
2. Web Apps > Add a Web App
3. Add your app name and the tunnel URL
4. Connect and launch from the glasses app grid

Stop the tunnel with `Ctrl+C`. You can also run `npx mrbd-cli start --help` for more options.

## Authentication

This project includes `@mrbd/auth` and a ready-made `/sign-in` demo that adapts to the device just like the home page: the glasses get the 600 x 600 D-pad pairing screen (`components/glasses-sign-in.tsx`) and phones/computers get the same flow in a responsive centered layout (`components/web-sign-in.tsx`). It's reachable from the **Sign In Demo** button on the glasses home and the **Try the sign-in demo** link on the web landing. Either way it uses the MRBD-hosted device-pairing flow: the glasses show a short code, the user enters it and their email on their phone at `mrbd.link`, and the glasses receive their own session.

To enable it for your app:

1. Register your app at [mrbd.dev/portal/apps/new](https://mrbd.dev/portal/apps/new). Add the origin(s) your app is served from (your tunnel/production URL) to the allow-list.
2. Replace `MRBD_APP_ID` in `lib/mrbd-app.ts` with the app ID you registered.

```tsx
import { MrbdAuthProvider, MrbdAuthGate } from "@mrbd/auth/react";

<MrbdAuthProvider appId="com.example.your-app">
  <MrbdAuthGate>
    <YourSignedInApp />
  </MrbdAuthGate>
</MrbdAuthProvider>;
```
