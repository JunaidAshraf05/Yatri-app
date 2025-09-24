import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import Home from "./Home";
import Alerts from "./Alerts";
import "./Home.css";
import "./i18n"; // Import i18n config

function Maps() {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showLiveEvents, setShowLiveEvents] = useState(true);
  const [view, setView] = useState("map"); // map | list
  const [quickNavCategory, setQuickNavCategory] = useState(null); // new state for quick navigation category

  return view === "map" ? (
    <div>
      <div className="safety-map-header" style={{ marginBottom: 16 }}>
        <h2>Safety Map</h2>
        <p>Risk zones and events in your area</p>
      </div>
      <div className="current-location-box" style={{ marginBottom: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8, maxWidth: 300 }}>
        <strong>Current Location</strong>
        <div>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Unknown"}</div>
      </div>
      <div className="map-canvas" style={{ height: 400 }}>
        <MapContainer
          center={coords ? [coords.lat, coords.lng] : [20.5937, 78.9629]}
          zoom={coords ? 14 : 5}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </div>
    </div>
  ) : (
    <div className="list-view">List view coming soon</div>
  );
}

function Reviews() {
  const [reviews, setReviews] = useState(() => {
    try {
      const saved = localStorage.getItem("reviews_v1");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    const seed = [
      { id: 1, name: "Sarah Johnson", location: "Central Park", rating: 4, safety: 5, text: "Clean and family friendly.", createdAt: Date.now() - 86400000 },
      { id: 2, name: "Arun Kumar", location: "Market Street", rating: 3, safety: 3, text: "Crowded but manageable.", createdAt: Date.now() - 172800000 }
    ];
    try { localStorage.setItem("reviews_v1", JSON.stringify(seed)); } catch (_) {}
    return seed;
  });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent"); // recent | rating | safety
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", rating: 4, safety: 4, text: "" });

  useEffect(() => {
    try { localStorage.setItem("reviews_v1", JSON.stringify(reviews)); } catch (_) {}
  }, [reviews]);

  const avg = (key) => {
    if (!reviews.length) return 0;
    const v = reviews.reduce((s, r) => s + (r[key] || 0), 0) / reviews.length;
    return Math.round(v * 10) / 10;
  };

  const filtered = reviews.filter(r => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.text.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "safety") return b.safety - a.safety;
    return b.createdAt - a.createdAt;
  });

  const submitReview = (e) => {
    e.preventDefault();
    if (!form.name || !form.location || !form.text) return;
    const next = {
      id: Date.now(),
      name: form.name,
      location: form.location,
      rating: Number(form.rating),
      safety: Number(form.safety),
      text: form.text,
      createdAt: Date.now()
    };
    setReviews([next, ...reviews]);
    setShowForm(false);
    setForm({ name: "", location: "", rating: 4, safety: 4, text: "" });
  };

  return (
    <div className="container reviews-page">
      <div className="reviews-hero">
        <div>
          <div className="reviews-hero-title">Location Reviews</div>
          <div className="reviews-hero-sub">{reviews.length} reviews from travelers</div>
        </div>
        <button className="add-review-btn" onClick={() => setShowForm(true)}>
          <span>＋</span> Add Review
        </button>
      </div>

      <div className="reviews-overview-card">
        <div className="overview-title">Community Overview</div>
        <div className="overview-grid">
          <div className="overview-item">
            <div className="overview-value">⭐ {avg("rating")}</div>
            <div className="overview-label">Average Rating</div>
          </div>
          <div className="overview-item">
            <div className="overview-value">🛡️ {avg("safety")}</div>
            <div className="overview-label">Safety Rating</div>
          </div>
        </div>
      </div>

      <div className="reviews-filter-card">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="reviews-search"
            placeholder="Search reviews by location or content..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="sort-row">
          <span className="sort-label"><span className="sort-icon">⎘</span> Sort by:</span>
          <div className="reviews-sort">
            <button className={`chip${sort === 'recent' ? ' primary' : ''}`} onClick={() => setSort('recent')}>Recent</button>
            <button className={`chip${sort === 'rating' ? ' primary' : ''}`} onClick={() => setSort('rating')}>Rating</button>
            <button className={`chip${sort === 'safety' ? ' primary' : ''}`} onClick={() => setSort('safety')}>Safety</button>
          </div>
        </div>
      </div>

      <div className="reviews-list">
        <div className="guidelines-card">
          <div className="guidelines-title"><span className="guidelines-icon">🛡️</span> Review Guidelines</div>
          <ul className="guidelines-list">
            <li>Share honest experiences to help fellow travelers</li>
            <li>Include specific safety tips and precautions</li>
            <li>Mention best times to visit for safety</li>
            <li>Be respectful and constructive in your feedback</li>
            <li>Report any unsafe situations to local authorities</li>
          </ul>
        </div>

        {filtered.map(r => (
          <div key={r.id} className="review-card">
            <div className="review-head">
              <div className="avatar">{r.name.charAt(0)}</div>
              <div className="info">
                <div className="name">{r.name}</div>
                <div className="meta">📍 {r.location} • {new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.round((Date.now()-r.createdAt)/86400000) || -0, 'day')}</div>
              </div>
              <div className="badges">
                <span className="star">⭐ {r.rating}/5</span>
                <span className={`safety-badge ${r.safety >= 4 ? 'safe' : r.safety >= 3 ? 'ok' : 'risk'}`}>{r.safety >= 4 ? 'Very Safe' : r.safety >= 3 ? 'Moderate' : 'Risky'}</span>
              </div>
            </div>
            <div className="review-text">{r.text}</div>
          </div>
        ))}
        {!filtered.length && <div style={{ color: '#6b7280', textAlign: 'center' }}>No reviews match your search.</div>}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Review</div>
            <form onSubmit={submitReview} className="review-form">
              <div className="form-row">
                <input className="input" placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                <input className="input" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required />
              </div>
              <div className="form-row">
                <label className="label">Rating
                  <input type="range" min="1" max="5" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} />
                </label>
                <label className="label">Safety
                  <input type="range" min="1" max="5" value={form.safety} onChange={e => setForm({ ...form, safety: e.target.value })} />
                </label>
              </div>
              <textarea className="textarea" rows="4" placeholder="Share your experience..." value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} required />
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn primary">Post Review</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
function More() {
  return (
    <div className="container" style={{ textAlign: "center", marginTop: 80 }}>
      <h2>More</h2>
      <p>More options coming soon.</p>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState("home");

  let MainContent;
  if (tab === "home") MainContent = <Home />;
  else if (tab === "alerts") MainContent = <Alerts />;
  else if (tab === "maps") MainContent = <Maps />;
  else if (tab === "reviews") MainContent = <Reviews />;
  else MainContent = <More />;

  return (
    <div>
      <div className="container">{MainContent}</div>
      <div className="bottom-nav">
        <div
          className={`nav-item${tab === "home" ? " active" : ""}`}
          onClick={() => setTab("home")}
        >
          <span role="img" aria-label="Home">
            🏠
          </span>
          <span>Home</span>
        </div>
        <div
          className={`nav-item${tab === "alerts" ? " active" : ""}`}
          onClick={() => setTab("alerts")}
        >
          <span role="img" aria-label="Alerts">
            ⚠️
          </span>
          <span>Alerts</span>
        </div>
        <div
          className={`nav-item${tab === "maps" ? " active" : ""}`}
          onClick={() => setTab("maps")}
        >
          <span role="img" aria-label="Maps">
            🗺️
          </span>
          <span>Maps</span>
        </div>
        <div
          className={`nav-item${tab === "reviews" ? " active" : ""}`}
          onClick={() => setTab("reviews")}
        >
          <span role="img" aria-label="Reviews">
            📝
          </span>
          <span>Reviews</span>
        </div>
        <div
          className={`nav-item${tab === "more" ? " active" : ""}`}
          onClick={() => setTab("more")}
        >
          <span role="img" aria-label="More">
            ☰
          </span>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export default App;