---
"create-mrbd-app": minor
---

Scaffold a device-adaptive app: the same URL now serves a normal responsive website to phone/computer visitors and the focused 600x600 D-pad experience to Meta Ray-Ban Display glasses. Detection happens on the server per request via a new `isOnMetaRayBanDisplay()` helper (`lib/mrbd-device.ts`), the 600x600 lock is scoped to the glasses, and both the home (`/`) and sign-in (`/sign-in`) routes render a glasses view or a responsive web view accordingly while sharing the same `@mrbd/auth` flow and a shared `MRBD_APP_ID`.
