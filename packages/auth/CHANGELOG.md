# @mrbd/auth

## 0.4.0

### Minor Changes

- 25d8578: Let developers customize or fully roll their own sign-in UI while keeping MRBD's hosted identity (so `@mrbd/data`/`@mrbd/storage` keep working).

  - `@mrbd/auth/react` now exposes headless hooks — `useMrbdEmailSignIn`, `useMrbdDeviceSignIn`, `useMrbdApproveDevice` — that drive the sign-in flow with no markup, plus a `theme` system (`MrbdAuthTheme`, `MrbdAuthProvider`'s `theme` prop, `useMrbdAuthStyles`) to re-skin the built-in screens. The default screens are unchanged.
  - `mrbd-cli apps create/update` accept `--verification-url` to set a developer-hosted phone pairing page per app.
  - `create-mrbd-app` starter docs explain theming and the headless hooks.

## 0.3.0

### Minor Changes

- 9c6f409: Add keyboard-first auth flows alongside glasses device pairing:

  - `MrbdEmailSignInScreen` (React): a direct email-OTP sign-in screen for web and phone surfaces, built on the existing `sendEmailOtp` / `verifyEmailOtp` methods. The scaffolded web sign-in view now uses it.
  - `approveDevice(userCode)` and the device-approval grant: an already-signed-in device can approve a new device's pairing so the new device receives its own session without re-entering an OTP. Adds the `approved` auth event and the `MrbdApproveDeviceScreen` React component.

## 0.2.3

### Patch Changes

- c232da5: Polish the glasses sign-in UI. `MrbdSignInScreen` now displays the pairing code in dash-separated groups of three (e.g. `A1B-2C3`) to match how mrbd.link formats it. `MrbdOtpNumpad` now handles D-pad Up/Down to move a full row across the 3-column grid (and Left/Right by one) instead of inheriting the app-level linear navigation that made every arrow move sideways.

## 0.2.2

### Patch Changes

- 64c58b6: Bind the global `fetch` to the global object before storing it on the client. Previously the client kept `globalThis.fetch` as an instance field and invoked it as `this.fetcher(...)`, which browsers reject with a synchronous "Illegal invocation" TypeError. Apps saw this as "Unable to reach the MRBD auth service" with no network request ever dispatched.

## 0.2.1

### Patch Changes

- 947a4ff: Point the default auth host at https://auth.mrbd.io.

## 0.2.0

### Minor Changes

- 670063b: First public release. Add the `@mrbd/auth/react` entry point with `MrbdAuthProvider`, `useMrbdAuth`, `MrbdSignInScreen`, `MrbdOtpNumpad`, and `MrbdAuthGate` for adding the MRBD-hosted device-pairing sign-in flow to React glasses apps. `react` is an optional peer dependency.
