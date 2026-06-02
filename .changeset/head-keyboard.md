---
"@mrbd/react": minor
---

Add a head-driven text input keyboard. `MrbdKeyboardProvider` + `useMrbdTextInput()` open a temporary 600x600 overlay where the wearer aims with head orientation (IMU) and pinches to type, with swipe gestures (right = space, left = delete, down = word suggestions, up = re-center) and built-in predictive text that learns picked words. Also exports the lower-level `MrbdHeadKeyboard` component, `useMrbdHeadPointer`, `createMrbdHeadPointer`, `createMrbdPredictionEngine` (+ `MRBD_DEFAULT_WORDLIST`), and `MRBD_DEFAULT_KEYBOARD_LAYOUT`.
