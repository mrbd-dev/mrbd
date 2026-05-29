---
"@mrbd/core": minor
"@mrbd/react": minor
---

Add Meta Ray-Ban Display request detection helpers.

`@mrbd/core` now exports `isMetaRayBanDisplayRequest` and `getMrbdRequestedWithHeader`, plus the `MRBD_REQUESTED_WITH_HEADER` and `MRBD_SMARTGLASS_BROWSER_REQUESTED_WITH` constants. These detect the in-glasses browser, which sends `x-requested-with: com.meta.smartglass.app.browser`, from request headers — accepting `Request`-like objects, `Headers`, plain header records, or header entry iterables (works in Next.js middleware, route handlers, and Server Components).

`@mrbd/react` re-exports the `useMetaRayBanDisplayRequest(headers)` hook so apps can branch their UI for glasses requests.
