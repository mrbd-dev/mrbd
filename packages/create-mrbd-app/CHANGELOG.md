# create-mrbd-app

## 0.4.0

### Minor Changes

- Replace DaisyUI with shadcn/ui in the starter template. The scaffold now ships a shadcn/ui setup (`components.json`, `lib/utils` `cn()` helper, `Button` and `Card` components, CSS-variable theme tokens, and `tailwindcss-animate`) instead of DaisyUI, while keeping the `@mrbd/*` D-pad components for glasses navigation.

## 0.3.0

### Minor Changes

- 670063b: Scaffold authentication into the starter: include `@mrbd/auth`, add an opt-in `/sign-in` example wired with `MrbdAuthProvider` and `MrbdAuthGate` (reachable from the home screen), and inject an app ID placeholder.

## 0.2.1

### Patch Changes

- 66ab400: Include `mrbd-cli` in the Next.js starter template with an `mrbd:start` script, updated docs, and tunnel-first glasses testing instructions.

## 0.2.0

### Minor Changes

- f75f0f7: Initial public release of the `@mrbd` package set:

  - `@mrbd/core`: viewport constants, D-pad keys, sensor helpers, location helpers, and lightweight storage helpers.
  - `@mrbd/react`: `MrbdViewport`, `MrbdButton`, `useDpadNavigation`, `useMrbdSensors`, `useMrbdLocation`.
  - `create-mrbd-app`: interactive CLI that scaffolds a Next.js MRBD starter with TypeScript, Tailwind, and DaisyUI.
