import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./Home.css";

function createRipple(e, ref) {
  const button = ref.current;
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.nativeEvent.offsetX - radius}px`;
  circle.style.top = `${e.nativeEvent.offsetY - radius}px`;
  circle.classList.add("ripple");

  // Remove old ripple if exists
  const ripple = button.getElementsByClassName("ripple")[0];
  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
}

export default function Home() {
  const { t, i18n } = useTranslation();

  // Example language switcher
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

  const [sosMessage, setSosMessage] = useState("");
  const sosRef = useRef(null);
  const riskRef = useRef(null);

  const handleSOS = async (e) => {
    createRipple(e, sosRef);
    try {
      let coordsText = "";
      if ("geolocation" in navigator) {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
        );
        const { latitude, longitude } = pos.coords;
        coordsText = `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}\nhttps://maps.google.com/?q=${latitude},${longitude}`;
      }

      const message = `EMERGENCY SOS! Please help. ${coordsText}`.trim();
      setSosMessage("SOS triggered. Opening dialer… you can share your location message if needed.");

      // Try share if supported
      if (navigator.share) {
        try { await navigator.share({ title: "Emergency SOS", text: message }); } catch (_) {}
      }

      // Open emergency number (works on mobile)
      try { window.open('tel:112'); } catch (_) {}

      // Fallback: open mail compose with message
      if (!navigator.share) {
        const mailto = `mailto:?subject=Emergency SOS&body=${encodeURIComponent(message)}`;
        window.open(mailto, '_blank');
      }

      setTimeout(() => setSosMessage(""), 6000);
    } catch (err) {
      setSosMessage("Unable to get location. Dialing emergency number…");
      try { window.open('tel:112'); } catch (_) {}
      setTimeout(() => setSosMessage(""), 6000);
    }
  };

  return (
    <div>
      {/* Language Switcher */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="lang-dropdown"
          aria-label="Select Language"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
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
          <span className="status-good">{t("good")}</span>
          <span>{t("safe_area")}</span>
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
          <span className="alerts-title">Active Alerts (2)</span>
        </div>
        <div className="alert alert-warning">
          <div>
            <span className="alert-title">High Crime Area</span>
            <span className="alert-badge warning">warning</span>
          </div>
          <div className="alert-desc">Increased pickpocketing reported in this area</div>
          <div className="alert-location">📍 Tourist District Center</div>
        </div>
        <div className="alert alert-danger">
          <div>
            <span className="alert-title">Weather Alert</span>
            <span className="alert-badge danger">danger</span>
          </div>
          <div className="alert-desc">Heavy rainfall and flooding expected</div>
          <div className="alert-location">📍 Downtown Area</div>
        </div>
      </div>

      {/* Critical Events Section */}
      <div className="critical-events-card">
        <div className="critical-header">
          <span className="critical-icon">⚠️</span>
          <span className="critical-title">Critical Events</span>
        </div>
        <div className="critical-alert">
          <div>
            <span className="critical-dot"></span>
            <span className="critical-alert-title">Flash Flood Warning</span>
            <span className="critical-badge">high</span>
          </div>
          <div className="critical-desc">Heavy rainfall may cause flooding in low-lying areas</div>
          <div className="critical-meta">
            <span className="critical-meta-item">📍 River District</span>
            <span className="critical-meta-item">🕒 7:34:23 PM</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="quick-actions-card">
        <div className="quick-title">Quick Actions</div>
        <div className="quick-actions">
          <div
            className={`quick-action sos`}
            ref={sosRef}
            onClick={handleSOS}
          >
            <span style={{ fontSize: "1.5rem", marginBottom: "6px" }}>⚠️</span>
            <div className="sos-text">Emergency SOS</div>
          </div>
          <div
            className={`quick-action risk`}
            ref={riskRef}
            onClick={e => createRipple(e, riskRef)}
          >
            <span style={{ fontSize: "1.5rem", marginBottom: "6px" }}>📍</span>
            <div className="risk-text">View Risk Zones</div>
          </div>
        </div>
      </div>
      {sosMessage && (
        <div className="maps-card" style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#b91c1c' }}>
          {sosMessage}
        </div>
      )}
    </div>
  );
}