import React, { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentPosition } from "./services/geolocation";
import { getWeather } from "./services/weather";
import { getCriticalAlerts } from "./services/alerts";
import { getNearbyCrimes } from "./services/crime";

function useAutoScroll(dep) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dep]);
  return ref;
}

export default function Chatbot({ triggerVisible = true, rectangle = false, open: openProp, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = typeof openProp === "boolean" ? openProp : internalOpen;
  const setOpen = (v) => {
    if (onOpenChange) onOpenChange(v);
    if (typeof openProp !== "boolean") setInternalOpen(v);
  };
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState(() => [
    { from: "bot", text: "Hi! I can help with weather, alerts, risk zones, SOS and more. Ask me anything about this app." },
  ]);
  const [text, setText] = useState("");
  const listRef = useAutoScroll(messages);

  const ask = async (q) => {
    const lc = q.toLowerCase();
    const wantsWeather = /weather|temperature|rain|forecast/.test(lc);
    const wantsAlert = /alert|critical|event|warning/.test(lc);
    const wantsCrime = /crime|safety|incident/.test(lc);
    const wantsSos = /sos|emergency|help/.test(lc);
    const wantsMap = /map|risk|zone|hazard/.test(lc);

    try {
      if (wantsSos) {
        return "Use the Emergency SOS button in Help. You can call 112 (all-in-one), 100 (police), 102 (ambulance), 101 (fire).";
      }
      if (wantsMap) {
        return "Open the Maps tab to view live risk zones and events based on weather intensity. Use the toggle to show Risk Zones and Live Events.";
      }

      if (wantsWeather || wantsAlert || wantsCrime) {
        const pos = await getCurrentPosition();
        const parts = [];
        if (wantsWeather || wantsAlert) {
          try {
            const w = await getWeather(pos.lat, pos.lon);
            parts.push(`Weather: ${Math.round(w.tempC)}°C, ${w.description}. Precip: ${w.precipitationMm.toFixed(1)} mm.`);
            if (w.severity === "danger") parts.push("Severe rainfall detected. Stay cautious in low-lying areas.");
          } catch (_) {}
        }
        if (wantsAlert) {
          try {
            const alerts = await getCriticalAlerts(pos.lat, pos.lon);
            if (alerts.length) {
              const a = alerts[0];
              parts.push(`Critical: ${a.title} · ${a.location}.`);
            } else {
              parts.push("No critical weather alerts right now for your point.");
            }
          } catch (_) {}
        }
        if (wantsCrime) {
          try {
            const cr = await getNearbyCrimes(pos.lat, pos.lon);
            if (cr.incidents?.length) {
              const one = cr.incidents[0];
              parts.push(`Crime nearby: ${one.offense} at ${one.location}. Reported recently.`);
            } else {
              parts.push("No crime incidents available. Crime data may require an API key.");
            }
          } catch (_) {
            parts.push("Could not fetch crime data at the moment.");
          }
        }
        if (parts.length) return parts.join(" \n");
      }

      return "I can help with: weather, alerts, risk zones, SOS, emergency numbers, and how to use each tab. Try: 'What's the weather now?' or 'Any critical alerts?'";
    } catch (e) {
      return "Sorry, I couldn't process that right now.";
    }
  };

  const onSend = async (e) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { from: "user", text: q }]);
    setText("");
    setBusy(true);
    const reply = await ask(q);
    setBusy(false);
    setMessages((m) => [...m, { from: "bot", text: reply }]);
  };

  return (
    <>
      <button
        className={`chat-fab${open || !triggerVisible ? " hidden" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        type="button"
      >
        💬
        <span className="chat-fab-tip">Chat</span>
      </button>

      {open && (
        <div className={`chat-panel${rectangle ? " rect" : ""}`} role="dialog" aria-label="Assistant chat">
          <div className="chat-head">
            <div className="chat-head-title">Assistant</div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
          </div>
          <div className="chat-list" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.from}`}>{m.text}</div>
            ))}
            {busy && <div className="chat-msg bot">Typing…</div>}
          </div>
          <form className="chat-input-row" onSubmit={onSend}>
            <input
              className="chat-input"
              placeholder="Ask about weather, alerts, SOS…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="chat-send" type="submit" disabled={busy}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}
