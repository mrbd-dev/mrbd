import {
  requestAndStartMrbdSensors,
  type MrbdMotion,
  type MrbdOrientation,
  type MrbdSensorError,
  type MrbdSensorSession,
} from "@mrbd/core";
import { useCallback, useRef, useState } from "react";

export type UseMrbdSensorsResult = {
  orientation: MrbdOrientation | null;
  motion: MrbdMotion | null;
  error: MrbdSensorError | null;
  active: boolean;
  start: () => Promise<MrbdSensorSession>;
  stop: () => void;
};

export function useMrbdSensors(): UseMrbdSensorsResult {
  const sessionRef = useRef<Extract<MrbdSensorSession, { ok: true }> | null>(null);
  const [orientation, setOrientation] = useState<MrbdOrientation | null>(null);
  const [motion, setMotion] = useState<MrbdMotion | null>(null);
  const [error, setError] = useState<MrbdSensorError | null>(null);
  const [active, setActive] = useState(false);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    stop();
    setError(null);

    const session = await requestAndStartMrbdSensors({
      onOrientation: setOrientation,
      onMotion: setMotion,
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

  return { orientation, motion, error, active, start, stop };
}
