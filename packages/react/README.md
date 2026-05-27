# @mrbd/react

React components and hooks for Meta Ray-Ban Display web apps.

This package is unofficial community tooling. It is not affiliated with, endorsed by, sponsored by, or approved by Meta Platforms, Inc., Ray-Ban, EssilorLuxottica, or their affiliates.

```bash
npm install @mrbd/react @mrbd/core
```

```tsx
import { MrbdButton, MrbdViewport, useDpadNavigation } from "@mrbd/react";

export function App() {
  useDpadNavigation();

  return (
    <MrbdViewport>
      <MrbdButton onClick={() => alert("Selected")}>Start</MrbdButton>
    </MrbdViewport>
  );
}
```
