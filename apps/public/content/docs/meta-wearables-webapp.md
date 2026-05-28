---
title: Meta's Official Plugin
description: "Use the Meta wearables webapp plugin alongside the MRBD packages."
order: 13
---
# Using With Meta's Official Plugin

Meta publishes an [AI-assisted plugin](https://github.com/facebookincubator/meta-wearables-webapp) for Claude Code, Codex, Cursor, and GitHub Copilot. It scaffolds **vanilla HTML / CSS / JavaScript** web apps for Meta Ray-Ban Display glasses.

The MRBD packages in this repo solve a different slice of the same problem: **reusable React and TypeScript building blocks** for app developers who prefer Next.js or another React stack.

The two work together — same target hardware, same constraints, different starting points.

## When to use which

| Use Meta's plugin if… | Use `@mrbd/*` packages if… |
| --- | --- |
| You want a single-file vanilla JS prototype. | You want a typed React component and hook library. |
| You're driving the build entirely from an AI chat skill. | You want stable npm packages, semver, and a CLI. |
| You don't need a build step. | You want Next.js, Tailwind, shadcn/ui, or your own framework. |
| You're following Meta's skills for `add-ui`, `add-device-sensors`, etc. | You want `MrbdViewport`, `MrbdButton`, `useDpadNavigation`, and helpers. |

You can use both. Their plugin's skills run in the AI tool; our packages are normal npm dependencies.

## Shared design contract

Both toolkits target the same physical device and follow the same rules. The MRBD packages are intentionally aligned with Meta's published display and performance guidelines.

| Rule | MRBD package | Meta plugin |
| --- | --- | --- |
| 600 x 600 dp fixed viewport | `MRBD_VIEWPORT_SIZE` | `width=600, height=600` viewport meta |
| 8 dp safe margin | `MRBD_SAFE_MARGIN` | `display-guidelines.md` |
| 88 dp minimum target size | `MRBD_MIN_TARGET_SIZE` | `display-guidelines.md` |
| Focus class for D-pad navigation | `.mrbd-focusable` and `.focusable` (both supported) | `.focusable` |
| D-pad keys | `DPAD` map (Arrow keys + Enter + Escape) | Same keys |
| Page background `#000000` is transparent | Documented in Viewport And Layout | `display-guidelines.md` |
| UI surfaces should be `#0a0a0f`–`#1C1E21` | Documented in Viewport And Layout | `display-guidelines.md` |
| PNG icons only — no SVG identity icons | Documented in Manifest And Icons | `create-webapp` skill |

If you find drift between the two, open an issue — the MRBD packages aim to stay consistent with the official guidelines.

## Performance budget

Meta's `performance-guidelines.md` calls out:

- < 500 KB gzipped JavaScript on load
- < 128 MB memory
- < 10 network requests on first paint
- 60 fps target

These are tight for a Next.js app. If you start with `create-mrbd-app`:

- Stay on a single client route.
- Avoid large client-side libraries.
- Inline small assets.
- Prefer CSS transitions over JS animations.
- Stop sensor and geolocation watchers on unmount.

If the budget is the dominating concern, prefer Meta's vanilla scaffold and pull MRBD constants from `@mrbd/core` as needed.

## Reusing MRBD constants from a vanilla app

Even a non-React app can `import { DPAD, MRBD_VIEWPORT_SIZE, MRBD_MIN_TARGET_SIZE } from "@mrbd/core";` to avoid hardcoding magic numbers. `@mrbd/core` is framework-agnostic and has no React dependency.

## Letting an AI build for you

If your AI tool supports MCP, point it at the [MRBD docs MCP server](/docs/mcp) so it can pull these guidelines on demand while it writes your app. Combine that with Meta's plugin for the scaffolding side and you get both halves: their skills for project setup, our docs and packages for the API surface.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Meta. The interop notes above describe how to use Meta's published open-source plugin alongside the MRBD packages.
