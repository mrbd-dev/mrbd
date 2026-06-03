# @mrbd/react

## 0.5.0

### Minor Changes

- 0269eb6: Add swipe-to-type to the head keyboard. A bare pinch-and-hold (`Unidentified`) now starts a swipe word: the wearer glides the reticle across the letters and pinches (`Enter`) to finish, and the traced path is decoded into the most likely word and inserted with a trailing space. Alternative matches appear in the suggestion bar — swipe left/right to cycle them in place, or swipe down to pick from the word menu; back or another hold mid-swipe cancels.

  Decoding is a compact, dependency-free SHARK2-style template matcher (scale-invariant shape channel + absolute location channel + endpoint weighting, with start/end pruning) that runs entirely on-device. Exposes `createMrbdSwipeDecoder(options?)` and a `swipeDecoder` prop on `MrbdKeyboardProvider` / `MrbdHeadKeyboard` to customize the vocabulary/tuning or disable swiping (`swipeDecoder={null}`).

  Also expands `MRBD_DEFAULT_WORDLIST` to a ~2000-word frequency-ordered list (used by both predictive completion and swipe decoding) for much better coverage.

- 0269eb6: Add system-level text input: `MrbdKeyboardProvider` now accepts `autoBind`, which makes native `<input>`, `<textarea>`, and `contenteditable` fields open the head keyboard automatically on D-pad activation (iOS keyboard style) and write the typed text back through the field's normal `onChange`. Fields drive their own behavior via standard attributes (`type`/`inputmode` → numeric layout, `maxLength`, `placeholder`/`aria-label`/`<label>` → title, `data-mrbd-keyboard="off"` to opt out).

  Also adds per-field opt-ins `MrbdInput` / `MrbdTextArea` and `useMrbdKeyboardField()`, a `MRBD_NUMERIC_KEYBOARD_LAYOUT`, and the field-binding primitives (`openMrbdKeyboardForField`, `mrbdFieldRequest`, `isMrbdEligibleField`, `setMrbdFieldValue`).

## 0.4.1

### Patch Changes

- b8f015d: Add a number row (1–0) to the default head keyboard layout, above the letters, so digits can be typed without a separate symbol mode. Also exports `MRBD_DEFAULT_NUMBERS`.

## 0.4.0

### Minor Changes

- 4aba533: Add a head-driven text input keyboard. `MrbdKeyboardProvider` + `useMrbdTextInput()` open a temporary 600x600 overlay where the wearer aims with head orientation (IMU) and pinches to type, with swipe gestures (right = space, left = delete, down = word suggestions, up = re-center) and built-in predictive text that learns picked words. Also exports the lower-level `MrbdHeadKeyboard` component, `useMrbdHeadPointer`, `createMrbdHeadPointer`, `createMrbdPredictionEngine` (+ `MRBD_DEFAULT_WORDLIST`), and `MRBD_DEFAULT_KEYBOARD_LAYOUT`.

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
