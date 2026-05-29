# @mrbd/auth

## 0.2.2

### Patch Changes

- 64c58b6: Bind the global `fetch` to the global object before storing it on the client. Previously the client kept `globalThis.fetch` as an instance field and invoked it as `this.fetcher(...)`, which browsers reject with a synchronous "Illegal invocation" TypeError. Apps saw this as "Unable to reach the MRBD auth service" with no network request ever dispatched.

## 0.2.1

### Patch Changes

- 947a4ff: Point the default auth host at https://auth.mrbd.io.

## 0.2.0

### Minor Changes

- 670063b: First public release. Add the `@mrbd/auth/react` entry point with `MrbdAuthProvider`, `useMrbdAuth`, `MrbdSignInScreen`, `MrbdOtpNumpad`, and `MrbdAuthGate` for adding the MRBD-hosted device-pairing sign-in flow to React glasses apps. `react` is an optional peer dependency.
