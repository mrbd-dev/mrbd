---
title: Storage
description: "Persist lightweight JSON with safe localStorage helpers."
order: 7
---
# Storage

MRBD web apps can use standard Web Storage APIs.

Use storage for lightweight data:

- preferences
- small caches
- onboarding state
- tiny app state

Avoid large blobs, images, or multi-megabyte data.

## JSON helpers

```ts
import { readStoredJson, writeStoredJson, removeStoredValue } from "@mrbd/core";

type Settings = {
  units: "metric" | "imperial";
};

const settings = readStoredJson<Settings>("settings", {
  units: "metric",
});

writeStoredJson("settings", settings.value ?? { units: "metric" });
removeStoredValue("settings");
```

The helpers return typed result objects instead of throwing for normal availability or parse failures.

They are safe to import during server rendering because storage is checked when each helper is called.
