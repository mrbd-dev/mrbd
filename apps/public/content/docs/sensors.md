---
title: Sensors
description: "Read motion and orientation data using browser sensor APIs."
order: 5
---
# Sensors

MRBD web apps use standard browser sensor APIs:

- `DeviceOrientationEvent` for heading, tilt, and roll.
- `DeviceMotionEvent` for acceleration, rotation rate, and G-force.

Request permission from a user gesture. Do not start sensors automatically on page load.

## Core helper

```ts
import { requestAndStartMrbdSensors } from "@mrbd/core";

const session = await requestAndStartMrbdSensors({
  onOrientation: (orientation) => {
    console.log(orientation.heading, orientation.tilt, orientation.roll);
  },
  onMotion: (motion) => {
    console.log(motion.gForce);
  },
  onError: (error) => {
    console.log(error);
  },
});

if (session.ok) {
  session.stop();
}
```

The helper returns a session object. Always call `stop()` when the view no longer needs sensor data.

## React hook

```tsx
import { useMrbdSensors } from "@mrbd/react";

export function SensorPanel() {
  const sensors = useMrbdSensors();

  return (
    <button onClick={sensors.start}>
      Start sensors
    </button>
  );
}
```

The React hook stores the latest orientation, motion, error, and active state.
