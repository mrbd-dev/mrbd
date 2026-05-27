---
title: API: @mrbd/core
description: "Framework-agnostic constants and browser helpers."
order: 9
---
# API: @mrbd/core

Install:

```bash
npm install @mrbd/core
```

## Constants

- `MRBD_VIEWPORT_SIZE` is `{ width: 600, height: 600 }`.
- `MRBD_SAFE_MARGIN` is `8`.
- `MRBD_MIN_TARGET_SIZE` is `88`.
- `DPAD` contains the keyboard keys used by MRBD navigation.
- `isDpadKey(key)` checks whether a string is one of the supported keys.

## Sensors

- `requestAndStartMrbdSensors(handlers)` requests permission where required, attaches motion and orientation listeners, and returns a session with `stop()`.
- `MrbdOrientation` includes `heading`, `tilt`, `roll`, and `absolute`.
- `MrbdMotion` includes acceleration, acceleration including gravity, rotation rate, interval, and computed `gForce`.

## Location

- `getCurrentMrbdPosition(options)` wraps `navigator.geolocation.getCurrentPosition`.
- `watchMrbdPosition(onPosition, onError, options)` wraps `navigator.geolocation.watchPosition` and returns a `stop()` handle.

## Storage

- `readStoredJson(key, fallback, storage?)`
- `writeStoredJson(key, value, storage?)`
- `removeStoredValue(key, storage?)`

All helpers are browser-safe at import time. They check browser APIs when called.
