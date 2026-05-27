# MRBD Packages Repo Plan

## Goal

Create a separate npm package and documentation monorepo for reusable Meta Ray-Ban Display (MRBD) web app tooling under the `@mrbd` npm organization.

This new repo should hold the stable, reusable building blocks that app developers can install into their own projects. The existing `mrbd-starter` repo should remain a small, copyable starter app that consumes those packages.

## Recommended Repos

### `mrbd` or `mrbd-js`

The new package and documentation monorepo.

This repo should contain:

- Published npm packages under the `@mrbd` scope.
- Documentation for building MRBD web apps.
- A CLI for creating new MRBD apps.
- Package examples and integration tests.
- Release tooling, changelogs, and versioning.

### `mrbd-starter`

The existing starter app repo.

This repo should contain:

- A minimal Next.js MRBD starter app.
- A working example of the published packages.
- App-level metadata, manifest, icons, and demo UI.
- No package publishing or release complexity.

The starter should eventually import from `@mrbd/core` and `@mrbd/react` instead of owning reusable primitives directly.

## Proposed New Repo Structure

```text
mrbd/
  apps/
    docs/
    playground/
  packages/
    core/
    react/
    create-mrbd-app/
  examples/
    next-basic/
    next-sensors/
    existing-site-adapter/
  package.json
  README.md
  tsconfig.base.json
```

## Package Responsibilities

### `@mrbd/core`

Framework-agnostic TypeScript utilities for MRBD web apps.

This package should not depend on React, Next.js, Tailwind, or DaisyUI.

Initial exports:

- `MRBD_VIEWPORT_SIZE`
- `MRBD_MIN_TARGET_SIZE`
- `DPAD`
- `DpadKey`
- `requestAndStartMrbdSensors`
- `MrbdOrientation`
- `MrbdMotion`
- `MrbdSensorHandlers`
- `getCurrentMrbdPosition`
- `MrbdLocationResult`
- `readStoredJson`
- `writeStoredJson`
- `removeStoredValue`

Source from this starter:

- `src/lib/mrbd/constants.ts`
- `src/lib/mrbd/sensors.ts`
- `src/lib/mrbd/location.ts`
- `src/lib/mrbd/storage.ts`

Package goals:

- Work in any browser-based web app.
- Be safe to import during server rendering.
- Avoid database, backend, and framework assumptions.
- Keep browser permissions behind explicit user gestures.
- Provide typed return values instead of throwing for normal permission and availability failures.

### `@mrbd/react`

React components and hooks for MRBD web apps.

This package should depend on React and may depend on `@mrbd/core`.
It should not depend on Next.js.

Initial exports:

- `MrbdViewport`
- `MrbdButton`
- `useDpadNavigation`

Near-term exports:

- `useMrbdSensors`
- `useMrbdLocation`
- `useStoredJson`

Source from this starter:

- `src/components/MrbdViewport.tsx`
- `src/components/MrbdButton.tsx`
- `src/hooks/useDpadNavigation.ts`

Package goals:

- Make Arrow key and Enter navigation easy to add.
- Keep interactive targets compatible with the MRBD 88 px minimum target size.
- Keep the default viewport fixed at 600 x 600 px.
- Allow style customization through `className` and props.
- Avoid requiring Tailwind or DaisyUI for basic use if possible.

Styling decision to make early:

- Option A: Keep Tailwind/DaisyUI class defaults and document them as optional styling assumptions.
- Option B: Ship minimal CSS from `@mrbd/react/styles.css`.
- Option C: Provide unstyled primitives plus example Tailwind classes.

Recommended first version: use mostly unstyled or lightly styled primitives with predictable class names and strong defaults, then let the starter demonstrate Tailwind/DaisyUI.

### `create-mrbd-app`

CLI package for creating a new MRBD web app from a template.

Initial command:

```bash
npm create mrbd-app@latest my-mrbd-app
```

or:

```bash
npx create-mrbd-app my-mrbd-app
```

Initial template:

- Next.js app.
- TypeScript.
- Tailwind CSS.
- DaisyUI.
- `@mrbd/core`.
- `@mrbd/react`.
- Fixed 600 x 600 layout.
- MRBD manifest defaults.
- PNG icon placeholders.
- Example D-pad navigable UI.
- Example sensor and location permission buttons.

Future templates:

- Vite React.
- Existing website adapter.
- Sensor-focused app.
- Location-focused app.
- Minimal no-framework app using `@mrbd/core`.

## Docs App

The docs app should explain both the platform constraints and the package APIs.

Recommended docs sections:

- Getting started.
- Create a new MRBD app.
- Add MRBD mode to an existing website.
- Viewport and layout.
- D-pad navigation.
- Buttons and focusable controls.
- Sensors and permissions.
- Location.
- Storage.
- Manifest and app icons.
- Testing on desktop.
- Testing on MRBD glasses.
- Publishing and sharing an MRBD web app.
- API reference for `@mrbd/core`.
- API reference for `@mrbd/react`.

Important guidance to include:

- Build for a fixed 600 x 600 px viewport.
- Avoid scrolling.
- Use dark backgrounds and high-contrast text.
- Do not depend on mouse, touch, hover, text input, camera, microphone, notifications, offline support, or browser back navigation.
- Make every interactive control reachable with Arrow keys and Enter.
- Use explicit user gestures before requesting sensor or location permissions.
- Clean up sensor and geolocation watchers.
- Use lightweight JSON only for web storage.
- Use Unicode symbols or high-resolution PNGs for app identity icons, not SVGs.

## Starter Repo Migration

After the new packages exist, update `mrbd-starter` to consume them.

Current local files to replace with package imports:

```ts
import { MrbdButton, MrbdViewport, useDpadNavigation } from "@mrbd/react";
import {
  getCurrentMrbdPosition,
  readStoredJson,
  requestAndStartMrbdSensors,
  writeStoredJson,
} from "@mrbd/core";
```

Then remove or stop exporting the local equivalents from:

- `src/components/MrbdViewport.tsx`
- `src/components/MrbdButton.tsx`
- `src/hooks/useDpadNavigation.ts`
- `src/lib/mrbd/constants.ts`
- `src/lib/mrbd/sensors.ts`
- `src/lib/mrbd/location.ts`
- `src/lib/mrbd/storage.ts`

The starter should remain the simplest complete example of using the packages in a real Next.js app.

## Release Tooling

Recommended tooling:

- npm workspaces for package management.
- TypeScript project references or shared base config.
- `tsup` or `unbuild` for package builds.
- Changesets for versioning and changelogs.
- GitHub Actions for lint, typecheck, build, and publish.

Initial package scripts:

```json
{
  "scripts": {
    "build": "npm run build --workspaces",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "publish-packages": "changeset publish"
  }
}
```

Recommended first npm versions:

- `@mrbd/core@0.1.0`
- `@mrbd/react@0.1.0`
- `create-mrbd-app@0.1.0`

Use `0.x` versions until the APIs have been tested in multiple real apps.

## Package Quality Bar

Each package should include:

- Typed public exports.
- README with installation and examples.
- Clear peer dependency declarations.
- ESM output.
- Type declarations.
- Small API surface.
- No hidden Next.js assumptions.
- Browser-safe server-render imports.

The packages should avoid:

- Database functions.
- Database triggers.
- Backend assumptions.
- Large dependencies.
- Automatic permission prompts on page load.
- UI that requires mouse, touch, hover, or text input.

## First Milestone

Create the new repo with:

- Workspace setup.
- `@mrbd/core` extracted from this starter.
- `@mrbd/react` extracted from this starter.
- A docs app skeleton.
- A playground app that imports the local packages.
- Package README files.
- Changesets configured.

Then publish beta packages and update `mrbd-starter` to install and use them.

## Second Milestone

Add `create-mrbd-app`.

The CLI should generate a new Next.js app that already includes:

- `@mrbd/core`
- `@mrbd/react`
- Tailwind CSS
- DaisyUI
- MRBD viewport metadata
- Manifest and PNG icon placeholders
- D-pad navigable starter screen
- Desktop testing instructions
- MRBD glasses testing instructions

## Third Milestone

Expand docs and examples.

Add examples for:

- A minimal app from scratch.
- Adding an MRBD-specific route to an existing website.
- Sensor-driven UI.
- Location-aware UI.
- Persistent lightweight state.
- Multi-screen D-pad navigation.

## Open Decisions

- New repo name: `mrbd`, `mrbd-js`, or `mrbd-web`.
- Package styling approach for `@mrbd/react`.
- Whether the docs app should use Next.js, Astro, or another docs framework.
- Whether the starter repo should become the source template for `create-mrbd-app`.
- Whether to support non-React packages soon, such as `@mrbd/dom`.

## Recommended Starting Point

Start with a new repo named `mrbd-js` or `mrbd`.

Build and publish only two packages first:

- `@mrbd/core`
- `@mrbd/react`

Use this starter app as the proof that the packages work. Once that loop feels solid, add `create-mrbd-app` and the full docs site.
