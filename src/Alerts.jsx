import React, { useState } from "react";
import "./Home.css";

const alertsData = [
  {
    type: "warning",
    title: "High Crime Area",
    desc: "Increased pickpocketing reported in this area",
    location: "Tourist District Center",
    time: "1h ago"
  },
  {
    type: "danger",
    title: "Weather Alert",
    desc: "Heavy rainfall and flooding expected",
    location: "Downtown Area",
    time: "2h ago"
  }
];

export default function Alerts() {
  const [filter, setFilter] = useState("all");

  // Share handler
  const handleShare = (title, desc, location) => {
    const text = `${title}\n${desc}\nLocation: ${location}`;
    if (navigator.share) {
      navigator.share({
        title,
        text,
      });
    } else {
      navigator.clipboard.writeText(text);
      alert("Alert copied to clipboard!");
    }
  };

  // Filter alerts
  const filteredAlerts = alertsData.filter(alert =>
    filter === "all" ? true : alert.type === filter
  );

  return (
    <div className="safety-alerts-section">
      {/* Header */}
      <div className="safety-alerts-header">
        <div>
          <div className="safety-alerts-title">Safety Alerts</div>
          <div className="safety-alerts-subtitle">2 alerts in your area</div>
        </div>
        <div className="safety-alerts-bell">
          <span role="img" aria-label="bell">🔔</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="alerts-search-card">
        <input className="alerts-search" placeholder="Search alerts..." />
        <div className="alerts-filters">
          <button
            className={`alerts-filter${filter === "all" ? " active" : ""}`}
            style={{ background: "#f87171", color: "#fff" }}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`alerts-filter${filter === "danger" ? " active" : ""}`}
            style={{ background: "#fee2e2", color: "#ef4444" }}
            onClick={() => setFilter("danger")}
          >
            Danger
          </button>
          <button
            className={`alerts-filter${filter === "warning" ? " active" : ""}`}
            style={{ background: "#fef9c3", color: "#eab308" }}
            onClick={() => setFilter("warning")}
          >
            Warning
          </button>
          <button
            className={`alerts-filter${filter === "info" ? " active" : ""}`}
            style={{ background: "#dbeafe", color: "#2563eb" }}
            onClick={() => setFilter("info")}
          >
            Info
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="alerts-settings-card">
        <div className="alerts-settings-title">Notification Settings</div>
        <div className="alerts-setting-row">
          <span><b>Push Notifications</b><br /><span style={{fontWeight:400}}>Receive alerts on your device</span></span>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </div>
        <div className="alerts-setting-row">
          <span><b>Location-based Alerts</b><br /><span style={{fontWeight:400}}>Get alerts for your current area</span></span>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="alerts-summary-card">
        <div className="alerts-summary-item critical">
          <div>1</div>
          <span>Critical</span>
        </div>
        <div className="alerts-summary-item warning">
          <div>1</div>
          <span>Warning</span>
        </div>
        <div className="alerts-summary-item info">
          <div>0</div>
          <span>Info</span>
        </div>
      </div>

      {/* Alert List */}
      {filteredAlerts.map((alert, idx) => (
        <div
          key={idx}
          className={`alert alert-${alert.type}`}
        >
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            <div>
              <span className="alert-title" style={{marginRight:8}}>{alert.title}</span>
              <span className={`alert-badge ${alert.type}`}>{alert.type}</span>
            </div>
            <span className="alert-dot green"></span>
          </div>
          <div className="alert-desc">{alert.desc}</div>
          <div className="alert-location">
            <span>📍 {alert.location}</span>
            <span style={{marginLeft: 12}}>🕒 {alert.time}</span>
          </div>
          <div className="alert-actions">
            <button
              className="alert-action-btn"
              onClick={() =>
                handleShare(
                  alert.title,
                  alert.desc,
                  alert.location
                )
              }
            >
              Share
            </button>
            <button className="alert-action-btn">Dismiss</button>
          </div>
        </div>
      ))}

      {/* Emergency Card */}
      <div className="emergency-card">
        <div>
          <span className="emergency-title">Emergency Situation?</span>
          <div className="emergency-desc">If you're in immediate danger, contact emergency services</div>
        </div>
        <button
          className="emergency-call-btn"
          onClick={() => window.open("tel:112")}
        >
          Call 112
        </button>
      </div>
    </div>
  );
}