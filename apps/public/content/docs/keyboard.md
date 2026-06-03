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
| Pinch & hold | `Unidentified` | **start a swipe word** (glide across letters, then pinch to finish) |
| Pinch, then pinch & hold | `Enter` then `Unidentified` (within ~1s) | open the swipe **command menu** |
| Swipe right | `ArrowRight` | space |
| Swipe left | `ArrowLeft` | delete |
| Swipe down | `ArrowDown` | open the word-suggestion menu |
| Swipe up | `ArrowUp` | open the re-center menu |
| Aim at ✓ / ✕ | `Enter` | submit / cancel |

> The glasses deliver a *pinch-and-hold* as a distinct one-shot key (`event.key === "Unidentified"`, `keyCode === 0`) rather than a long `Enter` — there's no auto-repeat or measurable hold duration. `@mrbd/react` exports `isMrbdPinchHold(event)` and `MRBD_PINCH_HOLD_KEY` if you want to detect it in your own handlers.

### Swipe to type

For faster entry, the wearer can **swipe whole words** instead of pinching each key — the same "glide typing" found on phone keyboards, adapted to head aiming:

1. **Pinch &amp; hold** (a bare `Unidentified`) to start a swipe. The reticle turns green and begins tracing a path.
2. **Glide** the reticle across the word's letters in order — you don't need to stop or click on each key.
3. **Pinch** (`Enter`) to finish. The traced path is decoded into the most likely word, which is inserted with a trailing space.

The decoded word's alternatives appear in the suggestion bar (the chosen one marked ✓). If the decoder guessed wrong:

- **Swipe right** steps to the next match (replacing the word in place; the auto-inserted trailing space is kept, so right isn't wasted on a redundant space here).
- **Swipe left** steps back toward the best match — and a left at the best match **deletes the whole swiped word**.
- **Swipe down** opens the word menu to aim + pinch a specific match.

Typing anything else (or starting a new swipe) dismisses the alternatives and restores left/right to delete/space. **Back** or another **pinch &amp; hold** mid-swipe cancels without inserting.

Decoding is a compact, dependency-free [SHARK2](http://pokristensson.com/pubs/KristenssonZhaiUIST2004.pdf)-style template matcher: each candidate word's ideal path (the polyline through its key centers) is compared against the trace using a scale-invariant *shape* channel and an absolute *location* channel, with start/end pruning over the word list. It runs entirely on-device with no model download or network call. Provide your own vocabulary/tuning, or disable swiping, via `swipeDecoder` (see below).

### Command menu

A **pinch immediately followed by a pinch-and-hold** (an `Enter` then an `Unidentified` key within ~1s) opens a swipe-driven command menu — no head-aim needed. The character the opening pinch would have typed is undone automatically. A *bare* pinch-and-hold (no preceding pinch) starts a [swipe word](#swipe-to-type) instead.

While the menu is open:

| Swipe | Action |
| --- | --- |
| Right | Enter / submit the text |
| Down | Recalibrate the neutral head pose |
| Up | Keyboard settings (reserved — layout switch, smoothing, etc.) |
| Left | Cancel (close the menu) |
| Back | Close the keyboard |
| Pinch & hold again | Dismiss the menu |

On open, the wearer looks at the center and pinches once to calibrate their neutral head pose.

## Automatic text fields (recommended)

The simplest integration is **system-level**: wrap your app once with `autoBind`, and every native `<input>`, `<textarea>`, and `contenteditable` element opens the head keyboard automatically when the wearer activates it (D-pad `Enter`) — just like the keyboard that pops up for inputs on iOS. The typed text is written straight back through the field's normal `onChange`, so controlled React inputs and forms keep working unchanged.

```tsx
import { MrbdKeyboardProvider } from "@mrbd/react";

function Root({ children, onGlasses }: { children: React.ReactNode; onGlasses: boolean }) {
  // Enable auto-bind on the glasses only; phones/computers use their own keyboard.
  return <MrbdKeyboardProvider autoBind={onGlasses}>{children}</MrbdKeyboardProvider>;
}

// Anywhere below the provider — no per-field wiring needed:
<input placeholder="Your name" maxLength={40} />
<input type="tel" placeholder="Phone" />        {/* opens the numeric layout */}
<textarea placeholder="Notes" />
```

The keyboard reads the field's own attributes so it behaves like the wearer expects:

| Attribute | Effect |
| --- | --- |
| `placeholder` / `aria-label` / `<label>` / `name` | becomes the keyboard title |
| `type="number" \| "tel"`, `inputmode="numeric \| decimal \| tel"` | uses the numeric layout |
| `maxLength` | caps the entered text |
| `data-mrbd-keyboard="off"` (or `disabled`/`readonly`) | opts the field (and its descendants) out |
| `data-mrbd-keyboard-layout="numeric \| default"` | force a layout |
| `data-mrbd-keyboard-title="..."` | override the title |

> Enable `autoBind` **only on the glasses** (gate it on `isMetaRayBanDisplayRequest`). On phones and computers, leave it off so the device's native keyboard is used. The `create-mrbd-app` template wires this up for you.

### Per-field opt-in

To get the same behavior on a single field without enabling provider-wide `autoBind`, use the drop-in components or the hook (both require a `MrbdKeyboardProvider` ancestor):

```tsx
import { MrbdInput, MrbdTextArea, useMrbdKeyboardField } from "@mrbd/react";

<MrbdInput placeholder="Your name" />
<MrbdTextArea placeholder="Notes" />

// Or attach to an existing element you control:
function NameField() {
  const ref = useMrbdKeyboardField<HTMLInputElement>();
  return <input ref={ref} placeholder="Your name" />;
}
```

## Imperative API

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

Suggestions appear in a bar above the keys and in the swipe-down menu. The default engine ranks a ~2000-word frequency-ordered list (`MRBD_DEFAULT_WORDLIST`) and boosts words the wearer has picked before (stored via the standard Web Storage helpers). Provide your own list or engine:

```tsx
import { MrbdKeyboardProvider, createMrbdPredictionEngine } from "@mrbd/react";

const prediction = createMrbdPredictionEngine({ words: myFrequencyList });

<MrbdKeyboardProvider prediction={prediction}>{children}</MrbdKeyboardProvider>;
```

## Swipe decoding

[Swipe-to-type](#swipe-to-type) is on by default with a decoder built from the same word list. Pass your own to widen the vocabulary or tune the matcher, or `null` to turn swiping off:

```tsx
import { MrbdKeyboardProvider, createMrbdSwipeDecoder } from "@mrbd/react";

const swipeDecoder = createMrbdSwipeDecoder({
  words: myFrequencyList, // rough frequency order; most common first
  maxWords: 2000,         // cap on templates built (bounds memory on-device)
  pruneRadius: 90,        // px tolerance for the first/last key vs. swipe endpoints
  endpointWeight: 0.6,    // trust the first/last keys (the reliable part of a swipe)
  frequencyWeight: 0.35,  // how strongly frequency breaks ties between similar shapes
});

<MrbdKeyboardProvider swipeDecoder={swipeDecoder}>{children}</MrbdKeyboardProvider>;
// or: <MrbdKeyboardProvider swipeDecoder={null}>…</MrbdKeyboardProvider>  // disable swiping
```

`decoder.decode(path, keys, limit?)` is also usable standalone: pass a list of `{ x, y }` points and a map of each letter to its key center, and it returns ranked `{ word, score }` candidates (lowest score first).

## Tuning

Pass `config` to adjust the head pointer (sensitivity, smoothing, axis inversion):

```tsx
<MrbdKeyboardProvider config={{ pxPerDegX: 22, pxPerDegY: 26, minCutoff: 0.4, beta: 0.02 }}>
  {children}
</MrbdKeyboardProvider>
```

The reticle is smoothed with an adaptive [1€ filter](https://gery.casiez.net/1euro/) so small, precise head movements don't jitter while fast movements stay responsive:

- **`minCutoff`** (Hz, default `0.4`) — smoothing applied when the head is nearly still. **Lower it** (e.g. `0.3`) if the reticle still feels jittery on precise aims; raise it if aiming feels laggy.
- **`beta`** (default `0.02`) — how quickly smoothing relaxes as you move faster. **Raise it** (e.g. `0.05`) if fast head sweeps lag behind; lower it for steadier slow tracking.

`smooth` (the old constant low-pass factor) is still accepted for backwards compatibility, but setting it opts out of the adaptive filter — prefer `minCutoff` / `beta`.

## Lower-level building blocks

- `MrbdHeadKeyboard` — the keyboard surface as a controlled component (`value` / `onChange` / `onSubmit` / `onCancel`).
- `useMrbdHeadPointer(config?)` — streams orientation and maps it to a cursor without re-rendering on every sample.
- `createMrbdHeadPointer(config?)` — the framework-agnostic calibration + angle-to-cursor math.
- `createMrbdPredictionEngine(options?)` and `MRBD_DEFAULT_WORDLIST`.
- `createMrbdSwipeDecoder(options?)` — the standalone SHARK2-style swipe/gesture word decoder.
- `MRBD_DEFAULT_KEYBOARD_LAYOUT` and `MRBD_NUMERIC_KEYBOARD_LAYOUT`.
- `MrbdInput` / `MrbdTextArea` and `useMrbdKeyboardField()` for per-field opt-in.
- `openMrbdKeyboardForField(el, requestText)`, `mrbdFieldRequest(el)`, `isMrbdEligibleField(el)`, and `setMrbdFieldValue(el, value)` — the field-binding primitives `autoBind` is built on.

While the keyboard is open it captures `Arrow`/`Enter`/`Escape` in the capture phase, so any app-level `useDpadNavigation` is paused until it closes.
