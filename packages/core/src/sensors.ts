export type MrbdOrientation = {
  heading: number | null;
  tilt: number | null;
  roll: number | null;
  absolute: boolean;
};

export type MrbdMotion = {
  acceleration: DeviceMotionEventAcceleration | null;
  accelerationIncludingGravity: DeviceMotionEventAcceleration | null;
  rotationRate: DeviceMotionEventRotationRate | null;
  interval: number;
  gForce: number | null;
};

export type MrbdSensorHandlers = {
  onOrientation?: (orientation: MrbdOrientation, event: DeviceOrientationEvent) => void;
  onMotion?: (motion: MrbdMotion, event: DeviceMotionEvent) => void;
  onError?: (error: MrbdSensorError) => void;
};

export type MrbdSensorError =
  | { error: "unavailable"; sensor: "orientation" | "motion" | "window" }
  | { error: "permission-denied" }
  | { error: "unknown"; message?: string };

export type MrbdSensorSession =
  | { ok: true; stop: () => void }
  | { ok: false; error: MrbdSensorError };

type PermissionState = "granted" | "denied" | "prompt";

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

function getGForce(acceleration: DeviceMotionEventAcceleration | null): number | null {
  if (acceleration?.x == null || acceleration.y == null || acceleration.z == null) return null;
  const magnitude = Math.sqrt(
    acceleration.x * acceleration.x + acceleration.y * acceleration.y + acceleration.z * acceleration.z,
  );
  return magnitude / 9.81;
}

async function requestOrientationPermission(): Promise<MrbdSensorError | null> {
  if (typeof DeviceOrientationEvent === "undefined") {
    return { error: "unavailable", sensor: "orientation" };
  }

  const orientationEvent = DeviceOrientationEvent as DeviceOrientationEventWithPermission;
  if (!orientationEvent.requestPermission) return null;

  try {
    const state = await orientationEvent.requestPermission();
    return state === "granted" ? null : { error: "permission-denied" };
  } catch (error) {
    return { error: "unknown", message: error instanceof Error ? error.message : undefined };
  }
}

export async function requestAndStartMrbdSensors(
  handlers: MrbdSensorHandlers,
): Promise<MrbdSensorSession> {
  if (typeof window === "undefined") {
    return { ok: false, error: { error: "unavailable", sensor: "window" } };
  }

  const permissionError = await requestOrientationPermission();
  if (permissionError) {
    handlers.onError?.(permissionError);
    return { ok: false, error: permissionError };
  }

  if (handlers.onMotion && typeof DeviceMotionEvent === "undefined") {
    const error: MrbdSensorError = { error: "unavailable", sensor: "motion" };
    handlers.onError?.(error);
    return { ok: false, error };
  }

  const handleOrientation = (event: DeviceOrientationEvent) => {
    handlers.onOrientation?.(
      {
        heading: event.alpha,
        tilt: event.beta,
        roll: event.gamma,
        absolute: event.absolute,
      },
      event,
    );
  };

  const handleMotion = (event: DeviceMotionEvent) => {
    handlers.onMotion?.(
      {
        acceleration: event.acceleration,
        accelerationIncludingGravity: event.accelerationIncludingGravity,
        rotationRate: event.rotationRate,
        interval: event.interval,
        gForce: getGForce(event.accelerationIncludingGravity),
      },
      event,
    );
  };

  if (handlers.onOrientation) {
    window.addEventListener("deviceorientation", handleOrientation);
  }

  if (handlers.onMotion) {
    window.addEventListener("devicemotion", handleMotion);
  }

  return {
    ok: true,
    stop: () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("devicemotion", handleMotion);
    },
  };
}
