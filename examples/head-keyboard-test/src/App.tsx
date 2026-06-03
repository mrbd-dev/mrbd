import { useEffect, useRef, useState } from "react";
import {
  MrbdKeyboardProvider,
  useMrbdTextInput,
  type MrbdHeadPointerConfig,
} from "@mrbd/react";

const wrap: React.CSSProperties = {
  minHeight: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 18,
  padding: 24,
  boxSizing: "border-box",
  background: "#000",
  color: "#fff",
  textAlign: "center",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const button: React.CSSProperties = {
  height: 64,
  padding: "0 28px",
  font: "inherit",
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: 1,
  color: "#001014",
  background: "#00d4ff",
  border: "2px solid #fff",
  borderRadius: 12,
  boxShadow: "0 0 22px rgba(0,212,255,0.5)",
};

const card: React.CSSProperties = {
  minWidth: 300,
  maxWidth: 460,
  background: "#101319",
  border: "1.5px solid #23262d",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 16,
  lineHeight: 1.4,
};

/** A small +/- stepper so smoothing can be dialed in live on the glasses. */
function Tuner({
  label,
  value,
  step,
  min,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  onChange: (next: number) => void;
}) {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}>
      <span style={{ width: 96, textAlign: "right", color: "#9aa0a6" }}>{label}</span>
      <button style={{ ...button, height: 40, padding: "0 14px" }} onClick={() => onChange(round(Math.max(min, value - step)))}>
        −
      </button>
      <span style={{ width: 56, fontWeight: 700, color: "#00d4ff" }}>{value}</span>
      <button style={{ ...button, height: 40, padding: "0 14px" }} onClick={() => onChange(round(value + step))}>
        +
      </button>
    </div>
  );
}

type KeyLine = { id: number; text: string };

/**
 * Raw key-event probe. Listens for keydown/keyup on the window and logs whether
 * the device fires a `keyup`, whether holds auto-repeat (`event.repeat`), and how
 * long Enter was held — so we can see empirically what a pinch/pinch-and-hold
 * actually emits on the glasses. Only meaningful while the keyboard is CLOSED
 * (the open keyboard captures these events itself).
 */
function KeyProbe() {
  const [lines, setLines] = useState<KeyLine[]>([]);
  const [holding, setHolding] = useState(false);
  const downAtRef = useRef<Record<string, number>>({});
  const repeatsRef = useRef(0);
  const idRef = useRef(0);

  useEffect(() => {
    const log = (text: string) => {
      setLines((prev) => [{ id: idRef.current++, text }, ...prev].slice(0, 12));
      // Mirror to the dev-server terminal via the /__probe endpoint.
      void fetch("/__probe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      }).catch(() => {});
    };

    const id = (e: KeyboardEvent) => `key=${e.key} code=${e.code || "∅"} kc=${e.keyCode}`;

    const onDown = (e: KeyboardEvent) => {
      const t = performance.now();
      if (e.repeat) {
        repeatsRef.current += 1;
        setHolding(true);
        log(`↓ ${id(e)} (repeat #${repeatsRef.current})`);
        return;
      }
      repeatsRef.current = 0;
      downAtRef.current[e.key] = t;
      setHolding(true);
      log(`↓ ${id(e)}`);
    };

    const onUp = (e: KeyboardEvent) => {
      const start = downAtRef.current[e.key];
      const held = start != null ? Math.round(performance.now() - start) : null;
      delete downAtRef.current[e.key];
      setHolding(Object.keys(downAtRef.current).length > 0);
      log(`↑ ${id(e)}${held != null ? ` — held ${held}ms` : " (no matching ↓)"}`);
    };

    // ---- catch-all logging for every other input event ----
    // High-frequency move/wheel events are throttled so they don't flood.
    const THROTTLED = new Set([
      "pointermove",
      "pointerrawupdate",
      "mousemove",
      "touchmove",
      "wheel",
      "scroll",
    ]);
    const lastThrottleLog: Record<string, number> = {};

    const detail = (e: Event): string => {
      const ev = e as unknown as Record<string, unknown> & {
        touches?: TouchList;
        changedTouches?: TouchList;
      };
      const parts: string[] = [];
      if (typeof ev.pointerType === "string") parts.push(`ptr=${ev.pointerType}`);
      if (typeof ev.button === "number") parts.push(`btn=${ev.button}/${ev.buttons ?? "?"}`);
      if (typeof ev.clientX === "number" && (ev.clientX || ev.clientY))
        parts.push(`@${Math.round(ev.clientX as number)},${Math.round(ev.clientY as number)}`);
      if (e.type.startsWith("touch"))
        parts.push(`t=${ev.touches?.length ?? 0}/ch=${ev.changedTouches?.length ?? 0}`);
      if (e.type === "wheel") parts.push(`dy=${Math.round((ev.deltaY as number) ?? 0)}`);
      if (e.type === "beforeinput" || e.type === "input")
        parts.push(`it=${ev.inputType ?? ""} data=${JSON.stringify(ev.data ?? null)}`);
      if (e.type.startsWith("composition")) parts.push(`data=${JSON.stringify(ev.data ?? null)}`);
      if (e.type === "visibilitychange") parts.push(document.visibilityState);
      const tgt = e.target as { tagName?: string } | null;
      if (tgt?.tagName) parts.push(`→${tgt.tagName.toLowerCase()}`);
      return parts.join(" ");
    };

    const onAny = (e: Event) => {
      if (THROTTLED.has(e.type)) {
        const now = performance.now();
        if (now - (lastThrottleLog[e.type] ?? 0) < 600) return;
        lastThrottleLog[e.type] = now;
      }
      log(`• ${e.type} ${detail(e)}`.trimEnd());
    };

    // keydown/keyup get the dedicated hold-duration handlers above; everything
    // else goes through the catch-all so we can spot any release-after-hold signal.
    const ANY_EVENTS = [
      "keypress",
      "beforeinput",
      "input",
      "pointerdown",
      "pointerup",
      "pointercancel",
      "pointermove",
      "pointerrawupdate",
      "pointerover",
      "pointerout",
      "pointerenter",
      "pointerleave",
      "gotpointercapture",
      "lostpointercapture",
      "mousedown",
      "mouseup",
      "click",
      "dblclick",
      "auxclick",
      "contextmenu",
      "mousemove",
      "touchstart",
      "touchend",
      "touchmove",
      "touchcancel",
      "wheel",
      "scroll",
      "focus",
      "blur",
      "focusin",
      "focusout",
      "compositionstart",
      "compositionupdate",
      "compositionend",
      "select",
      "selectionchange",
      "gamepadconnected",
      "gamepaddisconnected",
    ];

    window.addEventListener("keydown", onDown, true);
    window.addEventListener("keyup", onUp, true);
    for (const type of ANY_EVENTS) window.addEventListener(type, onAny, true);
    document.addEventListener("visibilitychange", onAny, true);

    return () => {
      window.removeEventListener("keydown", onDown, true);
      window.removeEventListener("keyup", onUp, true);
      for (const type of ANY_EVENTS) window.removeEventListener(type, onAny, true);
      document.removeEventListener("visibilitychange", onAny, true);
    };
  }, []);

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, letterSpacing: 1, color: "#6b6f76" }}>INPUT PROBE — all events (close keyboard first)</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: holding ? "#001014" : "#6b6f76",
            background: holding ? "#00d4ff" : "transparent",
            border: "1px solid #23262d",
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {holding ? "HOLDING" : "idle"}
        </span>
      </div>
      <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, lineHeight: 1.5, minHeight: 80 }}>
        {lines.length === 0 ? (
          <span style={{ color: "#6b6f76" }}>Pinch / hold to log events…</span>
        ) : (
          lines.map((l) => <div key={l.id}>{l.text}</div>)
        )}
      </div>
    </div>
  );
}

function Demo() {
  const { requestText } = useMrbdTextInput();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("Tap to open the head keyboard");

  async function open() {
    setStatus("Keyboard open…");
    const result = await requestText({ title: "Type something", initialValue: text });
    if (result === null) {
      setStatus("Cancelled");
    } else {
      setText(result);
      setStatus("Submitted");
    }
  }

  return (
    <>
      <h1 style={{ margin: 0, fontSize: 24, color: "#00d4ff" }}>Head Keyboard Test</h1>
      <button style={button} onClick={open}>
        OPEN KEYBOARD
      </button>
      <div style={card}>
        <div style={{ fontSize: 12, letterSpacing: 1, color: "#6b6f76", marginBottom: 4 }}>RESULT</div>
        <div style={{ minHeight: 22, fontWeight: 600, wordBreak: "break-word" }}>{text || "—"}</div>
      </div>
      <div style={{ fontSize: 13, color: "#9aa0a6" }}>{status}</div>
    </>
  );
}

export function App() {
  const [minCutoff, setMinCutoff] = useState(0.4);
  const [beta, setBeta] = useState(0.02);

  const config: MrbdHeadPointerConfig = { minCutoff, beta };

  return (
    // Re-key on the tuning values so each change rebuilds the head pointer with
    // the new smoothing; reopen the keyboard to feel the difference.
    <MrbdKeyboardProvider key={`${minCutoff}-${beta}`} config={config}>
      <div style={wrap}>
        <Demo />
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, letterSpacing: 1, color: "#6b6f76" }}>SMOOTHING (applies on next open)</div>
          <Tuner label="minCutoff" value={minCutoff} step={0.1} min={0.1} onChange={setMinCutoff} />
          <Tuner label="beta" value={beta} step={0.01} min={0} onChange={setBeta} />
          <div style={{ fontSize: 12, color: "#6b6f76", lineHeight: 1.4 }}>
            Lower <b>minCutoff</b> = less jitter when still. Higher <b>beta</b> = less lag when moving fast.
          </div>
        </div>
        <KeyProbe />
      </div>
    </MrbdKeyboardProvider>
  );
}
