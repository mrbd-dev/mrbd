# __MRBD_APP_TITLE__

A Meta Ray-Ban Display web app built with Next.js, Tailwind CSS, DaisyUI, `@mrbd/core`, and `@mrbd/react`.

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
