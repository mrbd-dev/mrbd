---
"@mrbd/auth": minor
"create-mrbd-app": patch
---

Add keyboard-first auth flows alongside glasses device pairing:

- `MrbdEmailSignInScreen` (React): a direct email-OTP sign-in screen for web and phone surfaces, built on the existing `sendEmailOtp` / `verifyEmailOtp` methods. The scaffolded web sign-in view now uses it.
- `approveDevice(userCode)` and the device-approval grant: an already-signed-in device can approve a new device's pairing so the new device receives its own session without re-entering an OTP. Adds the `approved` auth event and the `MrbdApproveDeviceScreen` React component.
