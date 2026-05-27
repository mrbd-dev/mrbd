# @mrbd/core

Framework-agnostic TypeScript utilities for Meta Ray-Ban Display web apps.

This package is unofficial community tooling. It is not affiliated with, endorsed by, sponsored by, or approved by Meta Platforms, Inc., Ray-Ban, EssilorLuxottica, or their affiliates.

```bash
npm install @mrbd/core
```

This package is safe to import during server rendering. Browser-only capabilities such as sensors, location, and storage are checked at call time.

```ts
import { DPAD, getCurrentMrbdPosition, requestAndStartMrbdSensors } from "@mrbd/core";
```
