# create-mrbd-app

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
