export type MrbdCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

export type MrbdLocationResult =
  | { ok: true; position: MrbdCoordinates }
  | {
      ok: false;
      error: "unavailable" | "permission-denied" | "position-unavailable" | "timeout" | "unknown";
      message?: string;
    };

export type MrbdLocationOptions = PositionOptions;

function toCoordinates(position: GeolocationPosition): MrbdCoordinates {
  const { coords } = position;
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    altitudeAccuracy: coords.altitudeAccuracy,
    heading: coords.heading,
    speed: coords.speed,
    timestamp: position.timestamp,
  };
}

function toLocationError(error: GeolocationPositionError): MrbdLocationResult {
  if (error.code === error.PERMISSION_DENIED) {
    return { ok: false, error: "permission-denied", message: error.message };
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return { ok: false, error: "position-unavailable", message: error.message };
  }

  if (error.code === error.TIMEOUT) {
    return { ok: false, error: "timeout", message: error.message };
  }

  return { ok: false, error: "unknown", message: error.message };
}

export function getCurrentMrbdPosition(
  options: MrbdLocationOptions = { timeout: 15000, maximumAge: 5000 },
): Promise<MrbdLocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ ok: false, error: "unavailable" });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ ok: true, position: toCoordinates(position) }),
      (error) => resolve(toLocationError(error)),
      options,
    );
  });
}

export function watchMrbdPosition(
  onPosition: (position: MrbdCoordinates) => void,
  onError?: (error: Exclude<MrbdLocationResult, { ok: true }>) => void,
  options?: MrbdLocationOptions,
): { ok: true; stop: () => void } | { ok: false; error: "unavailable" } {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, error: "unavailable" };
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => onPosition(toCoordinates(position)),
    (error) => onError?.(toLocationError(error) as Exclude<MrbdLocationResult, { ok: true }>),
    options,
  );

  return {
    ok: true,
    stop: () => navigator.geolocation.clearWatch(watchId),
  };
}
