---
"@mrbd/auth": minor
"mrbd-cli": minor
"create-mrbd-app": patch
---

Let developers customize or fully roll their own sign-in UI while keeping MRBD's hosted identity (so `@mrbd/data`/`@mrbd/storage` keep working).

- `@mrbd/auth/react` now exposes headless hooks — `useMrbdEmailSignIn`, `useMrbdDeviceSignIn`, `useMrbdApproveDevice` — that drive the sign-in flow with no markup, plus a `theme` system (`MrbdAuthTheme`, `MrbdAuthProvider`'s `theme` prop, `useMrbdAuthStyles`) to re-skin the built-in screens. The default screens are unchanged.
- `mrbd-cli apps create/update` accept `--verification-url` to set a developer-hosted phone pairing page per app.
- `create-mrbd-app` starter docs explain theming and the headless hooks.
