---
title: API: @mrbd/react
description: "React components and hooks for MRBD-compatible apps."
order: 10
---
# API: @mrbd/react

Install:

```bash
npm install @mrbd/react @mrbd/core
```

## Components

`MrbdViewport` renders a fixed 600x600 container with safe default styles.

```tsx
import { MrbdViewport } from "@mrbd/react";

export function App() {
  return <MrbdViewport>Content</MrbdViewport>;
}
```

`MrbdButton` renders a focusable button with an 88 px minimum target height and the `.mrbd-focusable` class.

## Hooks

`useDpadNavigation(options?)` attaches a keydown listener for Arrow keys, Enter, and Escape.

```tsx
useDpadNavigation({
  loop: true,
  onBack: () => console.log("back"),
});
```

`useMrbdSensors()` exposes `orientation`, `motion`, `error`, `active`, `start()`, and `stop()`.

`useMrbdLocation()` exposes `result`, `loading`, and `getCurrentPosition()`.

`useMetaRayBanDisplayRequest(headers)` returns whether the supplied request headers identify the Meta Ray-Ban Display browser.

## Head keyboard

`MrbdKeyboardProvider` + `useMrbdTextInput()` provide a head-aimed, predictive text-input overlay. Wrap the app in the provider, then `const text = await requestText({ title })` resolves with the typed string (or `null` if cancelled). See [Head Keyboard](/docs/keyboard) for the full guide.

Also exported: `MrbdHeadKeyboard` (controlled surface), `useMrbdHeadPointer`, `createMrbdHeadPointer`, `createMrbdPredictionEngine`, `MRBD_DEFAULT_WORDLIST`, and `MRBD_DEFAULT_KEYBOARD_LAYOUT`.

The React package has a peer dependency on React and depends on `@mrbd/core`.
