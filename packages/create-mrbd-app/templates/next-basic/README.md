# __MRBD_APP_TITLE__

A Meta Ray-Ban Display web app built with Next.js, Tailwind CSS, shadcn/ui, `@mrbd/core`, `@mrbd/react`, and `@mrbd/auth`.

## Develop

```bash
npm install
npm run dev
```

Use Chrome DevTools with a 600 x 600 viewport. Navigate with Arrow keys and Enter.

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

This project includes `@mrbd/auth` and a ready-made sign-in example at `app/sign-in/page.tsx` (reachable from the **Sign In Demo** button on the home screen). It uses the MRBD-hosted device-pairing flow: the glasses show a short code, the user enters it and their email on their phone at `mrbd.link`, and the glasses receive their own session.

To enable it for your app:

1. Register your app at [mrbd.dev/portal/apps/new](https://mrbd.dev/portal/apps/new). Add the origin(s) your app is served from (your tunnel/production URL) to the allow-list.
2. Replace `MRBD_APP_ID` in `app/sign-in/page.tsx` with the app ID you registered.

```tsx
import { MrbdAuthProvider, MrbdAuthGate } from "@mrbd/auth/react";

<MrbdAuthProvider appId="com.example.your-app">
  <MrbdAuthGate>
    <YourSignedInApp />
  </MrbdAuthGate>
</MrbdAuthProvider>;
```
