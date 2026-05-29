---
title: Testing And Publishing
description: "Verify apps locally, deploy to HTTPS, and add them to the glasses."
order: 12
---
# Testing And Publishing

## Desktop testing

Desktop testing should cover the core platform constraints before you try the app on glasses.

- Set the viewport to `600x600`.
- Use Arrow keys and Enter for every primary flow.
- Confirm focus is always visible.
- Confirm no essential action requires mouse, touch, hover, or text input.
- Trigger sensors and location from buttons.
- Test denied, timeout, and unavailable permission states.

## Hosting

MRBD web apps must be hosted at a public HTTPS URL.

Common options include Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host with valid TLS.

HTTP-only URLs are not supported.

For temporary device testing before deployment, use `mrbd start` to create a short-lived HTTPS tunnel.

## Device testing

In the Meta AI app with Developer Mode enabled:

- Open App Settings.
- Open App Connections.
- Choose Web Apps.
- Add your app name and deployed URL.
- Launch the app from the glasses app grid.

After launch, verify D-pad navigation, Enter activation, permissions, restart behavior, and readable contrast in real environments.
