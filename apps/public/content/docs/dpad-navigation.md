---
title: D-Pad Navigation
description: "Make web app controls work with Arrow keys and Enter."
order: 4
---
# D-Pad Navigation

MRBD input maps directional gestures to standard keyboard events:

- `ArrowUp`
- `ArrowDown`
- `ArrowLeft`
- `ArrowRight`
- `Enter`
- `Escape`

There is no continuous cursor. Focus jumps between controls.

## React hook

Use `useDpadNavigation` to wire global focus movement:

```tsx
import { MrbdButton, MrbdViewport, useDpadNavigation } from "@mrbd/react";

export function App() {
  useDpadNavigation();

  return (
    <MrbdViewport>
      <MrbdButton onClick={() => console.log("selected")}>
        Start
      </MrbdButton>
    </MrbdViewport>
  );
}
```

The hook looks for `.mrbd-focusable`, `.focusable`, buttons, links, and positive tabindex elements.

## Constants

```ts
import { DPAD } from "@mrbd/core";

console.log(DPAD.UP); // ArrowUp
console.log(DPAD.SELECT); // Enter
```

Use the constants when you need custom input handling outside the React hook.
