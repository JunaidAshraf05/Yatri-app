import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./Home.css";
import { getCurrentPosition } from "./services/geolocation";
import { getWeather } from "./services/weather";
import { getNearbyCrimes } from "./services/crime";
import { getCriticalAlerts } from "./services/alerts";

function createRipple(e, ref) {
  const button = ref.current;
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.nativeEvent.offsetX - radius}px`;
  circle.style.top = `${e.nativeEvent.offsetY - radius}px`;
  circle.classList.add("ripple");

  const ripple = button.getElementsByClassName("ripple")[0];
  if (ripple) ripple.remove();
  button.appendChild(circle);
}

export default function Home() {
  const { t, i18n } = useTranslation();

  const languages = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "bn", label: "বাংলা" },
    { code: "ta", label: "தமிழ்" },
    { code: "te", label: "తెలుగు" },
    { code: "mr", label: "मराठी" },
    { code: "gu", label: "ગુજરાતી" },
    { code: "kn", label: "ಕನ್ನಡ" },
    { code: "ml", label: "മലയാളം" },
    { code: "pa", label: "ਪੰਜਾਬੀ" },
    { code: "or", label: "ଓଡ଼ିଆ" },
    { code: "ur", label: "اردو" }
  ];

  const [coords, setCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [crime, setCrime] = useState({ incidents: [], provider: "none" });
  const [critical, setCritical] = useState([]);
  const [error, setError] = useState("");

  const sosRef = useRef(null);
  const riskRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const pos = await getCurrentPosition();
        if (cancelled) return;
        setCoords(pos);
        const [w, cr, ca] = await Promise.all([
          getWeather(pos.lat, pos.lon),
          getNearbyCrimes(pos.lat, pos.lon),
          getCriticalAlerts(pos.lat, pos.lon),
        ]);
        if (cancelled) return;
        setWeather(w);
        setCrime(cr);
        setCritical(ca);
      } catch (e) {
        setError(e?.message || "Failed to load location");
      }
    };
    load();

    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const alerts = useMemo(() => {
    const items = [];
    if (weather) {
      const sev = weather.severity === "danger" ? "danger" : weather.severity === "warning" ? "warning" : "warning";
      items.push({
        type: sev,
        title: "Weather Alert",
        desc: weather.severity === "danger" ? "Heavy rainfall and flooding possible" : weather.precipitationMm >= 0.1 ? "Light rain in your area" : weather.description,
        location: weather.locationName ? weather.locationName : "Your Area",
      });
    }
    if (crime?.incidents?.length) {
      const recent = crime.incidents[0];
      items.unshift({
        type: "warning",
        title: recent.offense || "Crime Alert",
        desc: recent.description || "Recent incident reported nearby",
        location: recent.location || "Nearby",
      });
    }
    return items;
  }, [weather, crime]);

  const firstCritical = useMemo(() => {
    if (critical && critical.length) return critical[0];
    if (weather && weather.severity === "danger") {
      return {
        title: "Flash Flood Warning",
        severity: "high",
        description: "Heavy rainfall may cause flooding in low-lying areas",
        location: "Your Area",
        sent: new Date().toISOString(),
      };
    }
    return null;
  }, [critical, weather]);

  const timeFmt = (iso) => {
    try { return new Date(iso).toLocaleTimeString(); } catch { return ""; }
  };

  return (
    <div>
      <div className="lang-switch" role="tablist" aria-label="Language selector">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`lang-chip${i18n.language === lang.code ? " active" : ""}`}
            role="tab"
            aria-selected={i18n.language === lang.code}
          >
            {lang.label}
          </button>
        ))}
      </div>

      <div className="welcome-card">
        <div>
          <h2>{t("welcome", { name: "Junaid Ashraf" })}</h2>
          <p>{t("stay_safe")}</p>
        </div>
        <div className="shield-icon">
          <svg width="36" height="36" fill="none">
            <circle cx="18" cy="18" r="16" stroke="#fff" strokeWidth="3"/>
            <path d="M18 25c3-2 5-4.5 5-7.5V13l-5-2-5 2v4.5C13 20.5 15 23 18 25Z" stroke="#fff" strokeWidth="2" fill="none"/>
          </svg>
        </div>
      </div>

      <div className="status-card">
        <div className="status-header">
          <span className="status-icon">📈</span>
          <span className="status-title">{t("safety_status")}</span>
        </div>
        <div className="status-content">
          <span className="status-good">{weather ? `${Math.round(weather.tempC)}°C · ${weather.main}` : t("good")}</span>
          <span>{coords ? `${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}` : t("safe_area")}</span>
        </div>
        <div className="status-shield">
          <svg width="48" height="48" fill="none">
            <circle cx="24" cy="24" r="20" fill="#E6FFF2"/>
            <path d="M24 33c4-2.7 7-6.1 7-10.1V17l-7-2.8L17 17v5.9C17 26.9 20 30.3 24 33Z" stroke="#16C784" strokeWidth="2" fill="none"/>
          </svg>
        </div>
      </div>

      <div className="alerts-card">
        <div className="alerts-header">
          <span className="alerts-icon">⚠️</span>
          <span className="alerts-title">{`Active Alerts (${alerts.length})`}</span>
        </div>
        {alerts.map((a, i) => (
          <div key={i} className={`alert ${a.type === 'danger' ? 'alert-danger' : 'alert-warning'}`}>
            <div>
              <span className="alert-title">{a.title}</span>
              <span className={`alert-badge ${a.type === 'danger' ? 'danger' : 'warning'}`}>{a.type === 'danger' ? 'danger' : 'warning'}</span>
            </div>
            <div className="alert-desc">{a.desc}</div>
            <div className="alert-location">📍 {a.location}</div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="alert alert-warning">
            <div>
              <span className="alert-title">No Active Alerts</span>
              <span className="alert-badge warning">info</span>
            </div>
            <div className="alert-desc">All clear in your area right now</div>
            <div className="alert-location">📍 {coords ? "Your Area" : "Waiting for location"}</div>
          </div>
        )}
      </div>

      <div className="critical-events-card">
        <div className="critical-header">
          <span className="critical-icon">⚠️</span>
          <span className="critical-title">Critical Events</span>
        </div>
        {firstCritical ? (
          <div className="critical-alert">
            <div>
              <span className="critical-dot"></span>
              <span className="critical-alert-title">{firstCritical.title}</span>
              <span className="critical-badge">{firstCritical.severity || 'high'}</span>
            </div>
            <div className="critical-desc">{firstCritical.description}</div>
            <div className="critical-meta">
              <span className="critical-meta-item">📍 {firstCritical.location || 'Your Area'}</span>
              <span className="critical-meta-item">🕒 {timeFmt(firstCritical.sent)}</span>
            </div>
          </div>
        ) : (
          <div className="critical-alert">
            <div>
              <span className="critical-dot"></span>
              <span className="critical-alert-title">No critical events</span>
              <span className="critical-badge">low</span>
            </div>
            <div className="critical-desc">We'll notify you if something urgent happens nearby</div>
            <div className="critical-meta">
              <span className="critical-meta-item">📍 {coords ? "Your Area" : "Locating…"}</span>
              <span className="critical-meta-item">🕒 {timeFmt(new Date().toISOString())}</span>
            </div>
          </div>
        )}
      </div>

      <div className="quick-actions-card">
        <div className="quick-title">Quick Actions</div>
        <div className="quick-actions">
          <div
            className={`quick-action sos`}
            ref={sosRef}
            onClick={e => createRipple(e, sosRef)}
          >
            <span className="quick-icon">⚠️</span>
            <div className="sos-text">Emergency SOS</div>
          </div>
          <div
            className={`quick-action risk`}
            ref={riskRef}
            onClick={e => createRipple(e, riskRef)}
          >
            <span className="quick-icon">📍</span>
            <div className="risk-text">View Risk Zones</div>
          </div>
        </div>
        {error && <div className="alert alert-warning mt-12"><div className="alert-desc">{error}</div></div>}
      </div>
    </div>
  );
}
