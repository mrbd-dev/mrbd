---
"@mrbd/react": minor
---

Add system-level text input: `MrbdKeyboardProvider` now accepts `autoBind`, which makes native `<input>`, `<textarea>`, and `contenteditable` fields open the head keyboard automatically on D-pad activation (iOS keyboard style) and write the typed text back through the field's normal `onChange`. Fields drive their own behavior via standard attributes (`type`/`inputmode` → numeric layout, `maxLength`, `placeholder`/`aria-label`/`<label>` → title, `data-mrbd-keyboard="off"` to opt out).

Also adds per-field opt-ins `MrbdInput` / `MrbdTextArea` and `useMrbdKeyboardField()`, a `MRBD_NUMERIC_KEYBOARD_LAYOUT`, and the field-binding primitives (`openMrbdKeyboardForField`, `mrbdFieldRequest`, `isMrbdEligibleField`, `setMrbdFieldValue`).
