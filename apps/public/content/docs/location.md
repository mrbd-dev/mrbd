---
title: Location
description: "Request one-shot or watched geolocation from the paired phone."
order: 6
---
# Location

MRBD location uses the standard `navigator.geolocation` API. Location data comes from the paired phone.

Use explicit user actions before requesting location.

## One-shot location

```ts
import { getCurrentMrbdPosition } from "@mrbd/core";

const result = await getCurrentMrbdPosition({
  timeout: 15000,
  maximumAge: 5000,
});

if (result.ok) {
  console.log(result.position.latitude, result.position.longitude);
} else {
  console.log(result.error);
}
```

Use a timeout around 10-15 seconds. The first phone location fix can take several seconds.

## Watch location

```ts
import { watchMrbdPosition } from "@mrbd/core";

const watcher = watchMrbdPosition(
  (position) => console.log(position.latitude, position.longitude),
  (error) => console.log(error),
);

if (watcher.ok) {
  watcher.stop();
}
```

Always stop the watcher when it is no longer needed.
