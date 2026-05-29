---
title: Introduction
description: "What the MRBD packages are and when to use them."
order: 1
---
# Introduction

MRBD is an unofficial package set for building web applications that target Meta Ray-Ban Display glasses.

The project has five parts:

- `@mrbd/core` provides framework-agnostic constants and browser helpers.
- `@mrbd/react` provides React components and hooks.
- `@mrbd/auth` adds a glasses-owned sign-in flow through MRBD-hosted auth, with optional React components.
- `mrbd-cli` exposes a local dev server through a hosted HTTPS tunnel for glasses testing.
- `create-mrbd-app` scaffolds a Next.js starter app with MRBD-safe defaults and wires in `mrbd-cli` via `npm run mrbd:start`.

Use these packages when you want reusable code for fixed-size wearable display apps instead of copying platform glue into every project.

When you are ready to try an app on glasses, [Tunnel Testing](/docs/tunnel-testing) exposes your local dev server through a short-lived public HTTPS URL with no deploy. To sign users in, [`@mrbd/auth`](/docs/api-auth) runs an OTP flow that the glasses browser owns directly.

## Core constraints

- Build for a fixed `600x600` viewport.
- Avoid scrolling where possible.
- Use dark backgrounds and high-contrast text.
- Treat pure black as transparent on the additive display.
- Make all interactive controls reachable by Arrow keys and Enter.
- Request sensors and location from explicit user gestures.
- Clean up listeners and geolocation watchers.
- Use high-resolution PNG icons or Unicode symbols, not SVG app icons.

## Unofficial status

This project is not affiliated with, endorsed by, sponsored by, or approved by Meta Platforms, Inc., Ray-Ban, EssilorLuxottica, or their affiliates.
