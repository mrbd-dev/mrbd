---
"@mrbd/auth": patch
---

Bind the global `fetch` to the global object before storing it on the client. Previously the client kept `globalThis.fetch` as an instance field and invoked it as `this.fetcher(...)`, which browsers reject with a synchronous "Illegal invocation" TypeError. Apps saw this as "Unable to reach the MRBD auth service" with no network request ever dispatched.
