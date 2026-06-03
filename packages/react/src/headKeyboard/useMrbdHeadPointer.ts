import {
  requestAndStartMrbdSensors,
  type MrbdSensorError,
  type MrbdSensorSession,
} from "@mrbd/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMrbdHeadPointer,
  type HeadCursor,
  type HeadOrientation,
  type MrbdHeadPointerConfig,
} from "./headPointer.js";

export type UseMrbdHeadPointerResult = {
  /** Request orientation permission and begin streaming. */
  start: () => Promise<MrbdSensorSession>;
  /** Stop the sensor stream. */
  stop: () => void;
  /** Resize the pointer surface (recreates the pointer; recalibrate after). */
  configure: (size: { width: number; height: number }) => void;
  /** Capture the current head pose as the neutral center. */
  calibrate: () => boolean;
  /** Read the latest smoothed cursor from the current orientation. */
  read: () => HeadCursor;
  isCalibrated: () => boolean;
  active: boolean;
  error: MrbdSensorError | null;
};

/**
 * Streams device orientation and maps it to a head-driven cursor. Orientation
 * samples are kept in a ref (not React state) so the ~50Hz stream does not
 * re-render the consumer; read the cursor from a rAF loop via `read()`.
 */
export function useMrbdHeadPointer(initialConfig: MrbdHeadPointerConfig = {}): UseMrbdHeadPointerResult {
  const configRef = useRef<MrbdHeadPointerConfig>(initialConfig);
  const pointerRef = useRef(createMrbdHeadPointer(initialConfig));
  const orientationRef = useRef<HeadOrientation>({ heading: null, tilt: null });
  const sessionRef = useRef<Extract<MrbdSensorSession, { ok: true }> | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<MrbdSensorError | null>(null);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    stop();
    setError(null);
    const session = await requestAndStartMrbdSensors({
      onOrientation: (orientation) => {
        orientationRef.current = { heading: orientation.heading, tilt: orientation.tilt };
        // Advance the smoothing filter on each real sensor sample (~50Hz) rather
        // than once per animation frame — feeding it at the rAF rate injects
        // duplicate samples that spike the 1€ filter's velocity estimate and
        // make it briefly stop smoothing (perceived as jitter). `read()` then
        // just returns the latest filtered cursor.
        pointerRef.current.update(orientationRef.current);
      },
      onError: setError,
    });
    if (session.ok) {
      sessionRef.current = session;
      setActive(true);
    } else {
      setError(session.error);
    }
    return session;
  }, [stop]);

  const configure = useCallback((size: { width: number; height: number }) => {
    const wasCalibrated = pointerRef.current.isCalibrated();
    configRef.current = { ...configRef.current, ...size };
    pointerRef.current = createMrbdHeadPointer(configRef.current);
    if (wasCalibrated) pointerRef.current.calibrate(orientationRef.current);
  }, []);

  const calibrate = useCallback(() => pointerRef.current.calibrate(orientationRef.current), []);
  // The filter is advanced from the sensor callback (sample-timed); reading just
  // returns the latest smoothed cursor so the rAF loop doesn't re-filter at 60Hz.
  const read = useCallback(() => pointerRef.current.cursor, []);
  const isCalibrated = useCallback(() => pointerRef.current.isCalibrated(), []);

  useEffect(() => stop, [stop]);

  return { start, stop, configure, calibrate, read, isCalibrated, active, error };
}
