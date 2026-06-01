# mrbd-cli

## 0.4.0

### Minor Changes

- 25d8578: Let developers customize or fully roll their own sign-in UI while keeping MRBD's hosted identity (so `@mrbd/data`/`@mrbd/storage` keep working).

  - `@mrbd/auth/react` now exposes headless hooks — `useMrbdEmailSignIn`, `useMrbdDeviceSignIn`, `useMrbdApproveDevice` — that drive the sign-in flow with no markup, plus a `theme` system (`MrbdAuthTheme`, `MrbdAuthProvider`'s `theme` prop, `useMrbdAuthStyles`) to re-skin the built-in screens. The default screens are unchanged.
  - `mrbd-cli apps create/update` accept `--verification-url` to set a developer-hosted phone pairing page per app.
  - `create-mrbd-app` starter docs explain theming and the headless hooks.

## 0.3.0

### Minor Changes

- 2a9e87a: Add developer account login and auth app management to the CLI. New commands: `mrbd login`, `mrbd logout`, `mrbd whoami`, and `mrbd apps` (`list`, `get`, `create`, `update`). The CLI authenticates with email OTP, stores the session under `~/.mrbd/credentials.json`, and manages auth apps directly against Supabase under row-level security. Override the target instance with `MRBD_SUPABASE_URL` / `MRBD_SUPABASE_PUBLISHABLE_KEY`.
