# create-mrbd-app

## 0.6.0

### Minor Changes

- 0269eb6: The `next-basic` scaffold now wires up the head keyboard: it wraps the app in `MrbdKeyboardProvider` with `autoBind` enabled on the glasses (via a new `MrbdKeyboardRoot` component in `app/layout.tsx`), so native `<input>`/`<textarea>` fields open the head-aimed keyboard automatically on-device while phones/computers keep their own keyboard. The template `AGENTS.md` documents head-aimed typing and swipe-to-type so generated apps follow the same conventions.

## 0.5.3

### Patch Changes

- 25d8578: Let developers customize or fully roll their own sign-in UI while keeping MRBD's hosted identity (so `@mrbd/data`/`@mrbd/storage` keep working).

  - `@mrbd/auth/react` now exposes headless hooks — `useMrbdEmailSignIn`, `useMrbdDeviceSignIn`, `useMrbdApproveDevice` — that drive the sign-in flow with no markup, plus a `theme` system (`MrbdAuthTheme`, `MrbdAuthProvider`'s `theme` prop, `useMrbdAuthStyles`) to re-skin the built-in screens. The default screens are unchanged.
  - `mrbd-cli apps create/update` accept `--verification-url` to set a developer-hosted phone pairing page per app.
  - `create-mrbd-app` starter docs explain theming and the headless hooks.

## 0.5.2

### Patch Changes

- 1b124c2: Add `allowedDevOrigins` (`*.vercel.run`, `*.mrbd.host`) to the starter's `next.config.mjs` so Next's dev-origin check doesn't block cross-origin dev asset / HMR requests when the app is previewed from a sandbox or tunnel origin while `next dev` runs. This lets Hot Module Replacement connect in the `/build` sandbox preview and on-glasses tunnel testing.

## 0.5.1

### Patch Changes

- 9c6f409: Add keyboard-first auth flows alongside glasses device pairing:

  - `MrbdEmailSignInScreen` (React): a direct email-OTP sign-in screen for web and phone surfaces, built on the existing `sendEmailOtp` / `verifyEmailOtp` methods. The scaffolded web sign-in view now uses it.
  - `approveDevice(userCode)` and the device-approval grant: an already-signed-in device can approve a new device's pairing so the new device receives its own session without re-entering an OTP. Adds the `approved` auth event and the `MrbdApproveDeviceScreen` React component.

## 0.5.0

### Minor Changes

- 4484ad5: Scaffold a device-adaptive app: the same URL now serves a normal responsive website to phone/computer visitors and the focused 600x600 D-pad experience to Meta Ray-Ban Display glasses. Detection happens on the server per request via a new `isOnMetaRayBanDisplay()` helper (`lib/mrbd-device.ts`), the 600x600 lock is scoped to the glasses, and both the home (`/`) and sign-in (`/sign-in`) routes render a glasses view or a responsive web view accordingly while sharing the same `@mrbd/auth` flow and a shared `MRBD_APP_ID`.

## 0.4.1

### Patch Changes

- 5abdcf2: Document the developer-account CLI in the scaffolded `AGENTS.md`: how to register and edit auth apps with `mrbd login` and `mrbd apps` instead of (or alongside) the web portal.

## 0.4.0

### Minor Changes

- Replace DaisyUI with shadcn/ui in the starter template. The scaffold now ships a shadcn/ui setup (`components.json`, `lib/utils` `cn()` helper, `Button` and `Card` components, CSS-variable theme tokens, and `tailwindcss-animate`) instead of DaisyUI, while keeping the `@mrbd/*` D-pad components for glasses navigation.

## 0.3.0

### Minor Changes

- 670063b: Scaffold authentication into the starter: include `@mrbd/auth`, add an opt-in `/sign-in` example wired with `MrbdAuthProvider` and `MrbdAuthGate` (reachable from the home screen), and inject an app ID placeholder.

## 0.2.1

### Patch Changes

- 66ab400: Include `mrbd-cli` in the Next.js starter template with an `mrbd:start` script, updated docs, and tunnel-first glasses testing instructions.

## 0.2.0

### Minor Changes

- f75f0f7: Initial public release of the `@mrbd` package set:

  - `@mrbd/core`: viewport constants, D-pad keys, sensor helpers, location helpers, and lightweight storage helpers.
  - `@mrbd/react`: `MrbdViewport`, `MrbdButton`, `useDpadNavigation`, `useMrbdSensors`, `useMrbdLocation`.
  - `create-mrbd-app`: interactive CLI that scaffolds a Next.js MRBD starter with TypeScript, Tailwind, and DaisyUI.
