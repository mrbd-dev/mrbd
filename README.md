# MRBD

Reusable npm packages for building web applications for Meta Ray-Ban Display glasses.

## Disclaimer

This is unofficial community tooling. It is not affiliated with, endorsed by, sponsored by, or approved by Meta Platforms, Inc., Ray-Ban, EssilorLuxottica, or their affiliates. Meta, Ray-Ban, and related names are trademarks of their respective owners and are used only to describe platform compatibility.

## Packages

- `@mrbd/core` - framework-agnostic constants and browser helpers for D-pad input, sensors, location, and storage.
- `@mrbd/react` - React components and hooks for 600 x 600 MRBD apps.
- `create-mrbd-app` - CLI for scaffolding a Next.js MRBD web app.

## Develop

```bash
npm install
npm run build
npm run typecheck
```

## Create An App

```bash
npm create mrbd-app@latest
```

The starter is built around the core MRBD constraints: fixed 600 x 600 viewport, dark additive display UI, Arrow key and Enter navigation, explicit permission requests for sensors and location, and PNG web app icons.
