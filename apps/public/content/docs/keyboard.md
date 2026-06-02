---
title: Head Keyboard
description: "Capture text on glasses with a head-aimed, predictive keyboard overlay."
order: 8
---
# Head Keyboard

MRBD has no on-screen typing field, so `@mrbd/react` ships a **head-driven keyboard**: a temporary 600x600 overlay where the wearer aims a reticle with head orientation (the IMU) and pinches to type. It uses only the inputs the glasses expose — head orientation plus the D-pad `Arrow`/`Enter` events that captouch and Neural Band gestures produce.

## Interaction model

| Gesture | Event | Action |
| --- | --- | --- |
| Move head | `deviceorientation` | aim the reticle |
| Click / pinch | `Enter` | type the hovered key |
| Swipe right | `ArrowRight` | space |
| Swipe left | `ArrowLeft` | delete |
| Swipe down | `ArrowDown` | open the word-suggestion menu |
| Swipe up | `ArrowUp` | open the re-center menu |
| Aim at ✓ / ✕ | `Enter` | submit / cancel |

On open, the wearer looks at the center and pinches once to calibrate their neutral head pose.

## Imperative API (recommended)

Wrap your app once, then await text anywhere:

```tsx
import { MrbdKeyboardProvider, useMrbdTextInput } from "@mrbd/react";

function Root({ children }: { children: React.ReactNode }) {
  return <MrbdKeyboardProvider>{children}</MrbdKeyboardProvider>;
}

function ReplyButton() {
  const { requestText } = useMrbdTextInput();

  async function onReply() {
    const text = await requestText({ title: "Reply" });
    if (text !== null) {
      // user submitted; send `text`
    }
  }

  return <button onClick={onReply}>Reply</button>;
}
```

`requestText(request?)` opens the keyboard overlay and resolves with the typed `string`, or `null` if the wearer cancels. The provider keeps a shared prediction engine so learned words persist across opens.

## Predictive text

Suggestions appear in a bar above the keys and in the swipe-down menu. The default engine ranks a compact frequency word list and boosts words the wearer has picked before (stored via the standard Web Storage helpers). Provide your own list or engine:

```tsx
import { MrbdKeyboardProvider, createMrbdPredictionEngine } from "@mrbd/react";

const prediction = createMrbdPredictionEngine({ words: myFrequencyList });

<MrbdKeyboardProvider prediction={prediction}>{children}</MrbdKeyboardProvider>;
```

## Tuning

Pass `config` to adjust the head pointer (sensitivity, smoothing, axis inversion):

```tsx
<MrbdKeyboardProvider config={{ pxPerDegX: 22, pxPerDegY: 26, smooth: 0.35 }}>
  {children}
</MrbdKeyboardProvider>
```

## Lower-level building blocks

- `MrbdHeadKeyboard` — the keyboard surface as a controlled component (`value` / `onChange` / `onSubmit` / `onCancel`).
- `useMrbdHeadPointer(config?)` — streams orientation and maps it to a cursor without re-rendering on every sample.
- `createMrbdHeadPointer(config?)` — the framework-agnostic calibration + angle-to-cursor math.
- `createMrbdPredictionEngine(options?)` and `MRBD_DEFAULT_WORDLIST`.
- `MRBD_DEFAULT_KEYBOARD_LAYOUT`.

While the keyboard is open it captures `Arrow`/`Enter`/`Escape` in the capture phase, so any app-level `useDpadNavigation` is paused until it closes.
