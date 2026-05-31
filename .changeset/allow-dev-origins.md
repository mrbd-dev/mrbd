---
"create-mrbd-app": patch
---

Add `allowedDevOrigins` (`*.vercel.run`, `*.mrbd.host`) to the starter's `next.config.mjs` so Next's dev-origin check doesn't block cross-origin dev asset / HMR requests when the app is previewed from a sandbox or tunnel origin while `next dev` runs. This lets Hot Module Replacement connect in the `/build` sandbox preview and on-glasses tunnel testing.
