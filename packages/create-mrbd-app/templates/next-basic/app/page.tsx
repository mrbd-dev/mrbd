"use client";

import { getCurrentMrbdPosition, requestAndStartMrbdSensors, type MrbdSensorSession } from "@mrbd/core";
import { MrbdButton, MrbdViewport, useDpadNavigation } from "@mrbd/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SensorStatus = {
  heading: string;
  tilt: string;
  gForce: string;
};

const initialSensorStatus: SensorStatus = {
  heading: "Waiting",
  tilt: "Waiting",
  gForce: "Waiting",
};

export default function Home() {
  useDpadNavigation();
  const router = useRouter();

  const sensorSession = useRef<Extract<MrbdSensorSession, { ok: true }> | null>(null);
  const [sensorStatus, setSensorStatus] = useState(initialSensorStatus);
  const [locationStatus, setLocationStatus] = useState("Not requested");

  useEffect(() => {
    return () => sensorSession.current?.stop();
  }, []);

  async function startSensors() {
    sensorSession.current?.stop();
    const session = await requestAndStartMrbdSensors({
      onOrientation: (orientation) => {
        setSensorStatus((current) => ({
          ...current,
          heading: orientation.heading == null ? "Unknown" : `${orientation.heading.toFixed(0)} deg`,
          tilt: orientation.tilt == null ? "Unknown" : `${orientation.tilt.toFixed(0)} deg`,
        }));
      },
      onMotion: (motion) => {
        setSensorStatus((current) => ({
          ...current,
          gForce: motion.gForce == null ? "Unknown" : `${motion.gForce.toFixed(2)} G`,
        }));
      },
    });

    if (session.ok) sensorSession.current = session;
  }

  function stopSensors() {
    sensorSession.current?.stop();
    sensorSession.current = null;
    setSensorStatus(initialSensorStatus);
  }

  async function requestLocation() {
    setLocationStatus("Requesting...");
    const result = await getCurrentMrbdPosition();

    if (!result.ok) {
      setLocationStatus(`Location ${result.error}`);
      return;
    }

    setLocationStatus(
      `${result.position.latitude.toFixed(4)}, ${result.position.longitude.toFixed(4)} (${Math.round(
        result.position.accuracy,
      )}m)`,
    );
  }

  return (
    <MrbdViewport className="text-white">
      <main className="flex h-full flex-col gap-4 rounded-[28px] bg-[#0a0a0f] p-5">
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">MRBD Web App</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">__MRBD_APP_TITLE__</h1>
          <p className="mt-2 text-base text-zinc-300">
            Built for a fixed 600 x 600 display, dark additive backgrounds, and Arrow key plus Enter navigation. Run{" "}
            <code className="text-cyan-200">npm run mrbd:start</code> to tunnel this app for glasses testing.
          </p>
        </section>

        <section className="grid flex-1 grid-cols-2 gap-3">
          <StatusCard label="Heading" value={sensorStatus.heading} />
          <StatusCard label="Tilt" value={sensorStatus.tilt} />
          <StatusCard label="Motion" value={sensorStatus.gForce} />
          <StatusCard label="Location" value={locationStatus} />
        </section>

        <nav className="grid grid-cols-2 gap-3">
          <MrbdButton onClick={startSensors}>Start Sensors</MrbdButton>
          <MrbdButton onClick={stopSensors}>Stop Sensors</MrbdButton>
          <MrbdButton className="col-span-2" onClick={requestLocation}>
            Request Location
          </MrbdButton>
          <MrbdButton className="col-span-2" onClick={() => router.push("/sign-in")}>
            Sign In Demo
          </MrbdButton>
        </nav>
      </main>
    </MrbdViewport>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#1C1E21] p-4">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-3 text-xl font-black text-white">{value}</p>
    </div>
  );
}
