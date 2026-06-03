# Head Keyboard Test

A tiny Vite + React app for prototyping the `@mrbd/react` head keyboard on real
glasses. It opens the keyboard, shows the typed result, and has live `minCutoff`
/ `beta` steppers so you can dial in the reticle smoothing on-device.

## Run it

From the repo root (installs the workspace and links `@mrbd/react`):

```bash
npm install
npm run build -w @mrbd/react        # build the package this example consumes
npm run dev -w @mrbd/example-head-keyboard-test
```

Vite serves on `http://localhost:5173` (bound to `0.0.0.0`).

## Expose it to the glasses

The glasses browser needs **HTTPS** for the orientation sensor, so tunnel the dev
server. With [ngrok](https://ngrok.com):

```bash
npm run tunnel -w @mrbd/example-head-keyboard-test   # ngrok http 5173
```

Open the printed `https://…ngrok…` URL in the Meta AI app: Developer Mode on →
App Settings → App Connections → Web Apps → Add a Web App, then paste the URL.

> Already have `mrbd-cli`? `npx mrbd-cli start --port 5173` gives an
> `https://<slug>.mrbd.host` tunnel + QR code instead.

## Iterating on the package

This app imports the built `@mrbd/react` from `dist`. To see source edits to the
package without restarting, run a watch build in another terminal:

```bash
npm run build -w @mrbd/react -- --watch    # tsc --watch
```

Vite will pick up the rebuilt files and hot-reload.
