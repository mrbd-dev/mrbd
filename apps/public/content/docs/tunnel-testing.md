---
title: Tunnel Testing
description: "Use mrbd start to expose a local app through a public HTTPS tunnel for device testing."
order: 12
---
# Tunnel Testing

`mrbd start` exposes your local dev server through a short-lived public HTTPS tunnel. Use this when you want to test an app on glasses before deploying it.

Apps created with `npm create mrbd-app@latest` already include `mrbd-cli` and an `mrbd:start` npm script.

```bash
npm run mrbd:start
```

The command:

- Starts `npm run dev` if nothing is listening on port `3000`.
- Requests a hosted tunnel session from MRBD.
- Writes a temporary `frpc` config with the session token.
- Installs the pinned FRP client on first run, then starts it and waits for the proxy to report success.
- Prints a public `https://<slug>.mrbd.host` URL and expiration time.
- Shows a terminal QR code for the URL.
- Revokes the tunnel session when you stop the command.

## Requirements

Install your app dependencies first:

```bash
npm install
```

The tunnel command downloads a pinned `frpc` binary on first run and stores it under `~/.mrbd/bin`. You can still pass an explicit local binary for debugging:

```bash
npx mrbd-cli start --frpc-path /path/to/frpc
```

## Options

```bash
npx mrbd-cli start --port 3000
npx mrbd-cli start --command "npm run dev"
npx mrbd-cli start --no-dev
```

Use `--no-dev` if you already started the local server yourself.

Use `--ttl <seconds>` to request a custom tunnel lifetime. The hosted service may clamp the requested value.

## Security

Tunnel URLs are public while the command is running. Do not use them with private data, admin sessions, or production credentials. The per-session tunnel token is written only to a temporary config file and removed when the command exits.

Stop the tunnel with `Ctrl+C`.
