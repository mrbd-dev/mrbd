# @mrbd/react

## 0.3.0

### Minor Changes

- 77eac0c: Add Meta Ray-Ban Display request detection helpers.

  `@mrbd/core` now exports `isMetaRayBanDisplayRequest` and `getMrbdRequestedWithHeader`, plus the `MRBD_REQUESTED_WITH_HEADER` and `MRBD_SMARTGLASS_BROWSER_REQUESTED_WITH` constants. These detect the in-glasses browser, which sends `x-requested-with: com.meta.smartglass.app.browser`, from request headers — accepting `Request`-like objects, `Headers`, plain header records, or header entry iterables (works in Next.js middleware, route handlers, and Server Components).

  `@mrbd/react` re-exports the `useMetaRayBanDisplayRequest(headers)` hook so apps can branch their UI for glasses requests.

### Patch Changes

- Updated dependencies [77eac0c]
  - @mrbd/core@0.3.0

## 0.2.0

### Minor Changes

- f75f0f7: Initial public release of the `@mrbd` package set:

  - `@mrbd/core`: viewport constants, D-pad keys, sensor helpers, location helpers, and lightweight storage helpers.
  - `@mrbd/react`: `MrbdViewport`, `MrbdButton`, `useDpadNavigation`, `useMrbdSensors`, `useMrbdLocation`.
  - `create-mrbd-app`: interactive CLI that scaffolds a Next.js MRBD starter with TypeScript, Tailwind, and DaisyUI.

### Patch Changes

- Updated dependencies [f75f0f7]
  - @mrbd/core@0.2.0
