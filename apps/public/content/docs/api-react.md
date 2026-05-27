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

The React package has a peer dependency on React and depends on `@mrbd/core`.
