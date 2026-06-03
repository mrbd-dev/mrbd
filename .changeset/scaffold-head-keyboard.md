---
"create-mrbd-app": minor
---

The `next-basic` scaffold now wires up the head keyboard: it wraps the app in `MrbdKeyboardProvider` with `autoBind` enabled on the glasses (via a new `MrbdKeyboardRoot` component in `app/layout.tsx`), so native `<input>`/`<textarea>` fields open the head-aimed keyboard automatically on-device while phones/computers keep their own keyboard. The template `AGENTS.md` documents head-aimed typing and swipe-to-type so generated apps follow the same conventions.
