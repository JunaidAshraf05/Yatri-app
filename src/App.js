import React, { useEffect, useMemo, useState } from "react";
import Home from "./Home";
import Alerts from "./Alerts";
import "./Home.css";
import "./i18n"; // Import i18n config
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Circle, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import Chatbot from "./Chatbot";

// Fix default marker icons for CRA
const DefaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function Maps() {
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [riskZones, setRiskZones] = useState(true);
  const [liveEvents, setLiveEvents] = useState(true);
  const [view, setView] = useState("map");
  const [hazards, setHazards] = useState([]);
  const [loadingHazards, setLoadingHazards] = useState(false);

  const getLocation = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
      },
      (err) => {
        const msg = err?.message || "Unable to retrieve your location.";
        setGeoError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const center = useMemo(
    () =>
      coords
        ? [coords.latitude, coords.longitude]
        : [22.9734, 78.6569], // India centroid
    [coords]
  );

  // Haversine distance in KM
  const distanceKm = (a, b) => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // Fetch precipitation (mm) using Open-Meteo (no key required)
  const fetchPrecip = async (lat, lng) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation&hourly=precipitation`;
      const res = await fetch(url);
      const data = await res.json();
      const cur = data?.current?.precipitation;
      if (typeof cur === "number") return cur;
      const arr = data?.hourly?.precipitation;
      if (Array.isArray(arr) && arr.length) return arr[0] ?? 0;
    } catch (e) {
      // swallow
    }
    return 0;
  };

  // Build hazards near user and along Indian coasts
  useEffect(() => {
    let abort = false;
    const load = async () => {
      setLoadingHazards(true);
      const pts = [
        coords
          ? { name: "Your Area", lat: coords.latitude, lng: coords.longitude }
          : null,
        { name: "Mumbai Coast", lat: 19.076, lng: 72.8777 },
        { name: "Chennai Coast", lat: 13.0827, lng: 80.2707 },
        { name: "Kolkata Delta", lat: 22.5726, lng: 88.3639 },
        { name: "Kochi Coast", lat: 9.9312, lng: 76.2673 },
        { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
      ].filter(Boolean);

      try {
        // Use Promise.allSettled so a single network failure doesn't reject everything
        const settled = await Promise.allSettled(
          pts.map((p) => fetchPrecip(p.lat, p.lng))
        );
        const precips = settled.map((s) => (s.status === "fulfilled" ? s.value ?? 0 : 0));

        if (abort) return;

        const base = coords
          ? { lat: coords.latitude, lng: coords.longitude }
          : { lat: 22.9734, lng: 78.6569 };

        const hz = pts
          .map((p, i) => {
            const precipitation = Number(precips[i] || 0);
            let level = "none";
            if (precipitation >= 8) level = "heavy"; // heavy rain
            else if (precipitation >= 1) level = "moderate"; // light/moderate
            const distance = distanceKm(base, { lat: p.lat, lng: p.lng });
            return {
              id: `${p.name}-${i}`,
              name: p.name,
              lat: p.lat,
              lng: p.lng,
              precipitation,
              level,
              distance,
            };
          })
          .filter((h) => h.level !== "none");

        setHazards(hz);
      } catch (err) {
        // Fail gracefully - keep hazards empty and log for debugging
        console.warn("Failed loading hazards:", err);
        setHazards([]);
      } finally {
        setLoadingHazards(false);
      }
    };

    load();
    return () => {
      abort = true;
    };
  }, [coords]);

  const sortedHazards = useMemo(() => {
    return [...hazards].sort((a, b) => a.distance - b.distance);
  }, [hazards]);

  const formatKm = (n) => `${n.toFixed(1)} km away`;
  const nowTime = () => new Date().toLocaleTimeString();

  return (
    <div className="maps-wrapper">
      <div className="maps-header">
        <div>
          <div className="maps-title">Safety Map</div>
          <div className="maps-subtitle">Risk zones and events in your area</div>
        </div>
        <button className="maps-locate-btn" onClick={getLocation} aria-label="Get current location">📡</button>
      </div>

      <div className="status-card maps-location-card">
        <div className="maps-location-row">
          <span className="maps-dot" />
          <div>
            <div className="maps-location-title">Current Location</div>
            <div className="maps-coords">
              {coords ? (
                <span>
                  {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                </span>
              ) : (
                <span>Fetching location…</span>
              )}
            </div>
          </div>
        </div>
        {geoError && <div className="maps-error">{geoError}</div>}
      </div>

      <div className="alerts-card maps-layers-card">
        <div className="maps-section-heading">
          <span role="img" aria-label="Layers">📚</span>
          <span>Map Layers</span>
        </div>

        <div className="maps-layer-row">
          <div>
            <div className="maps-layer-title">Risk Zones</div>
            <div className="maps-layer-desc">Show safety risk areas</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={riskZones}
              onChange={(e) => setRiskZones(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="maps-layer-row">
          <div>
            <div className="maps-layer-title">Live Events</div>
            <div className="maps-layer-desc">Show current incidents</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={liveEvents}
              onChange={(e) => setLiveEvents(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="maps-segment">
          <button
            className={`segment-btn${view === "map" ? " active" : ""}`}
            onClick={() => setView("map")}
          >
            Map View
          </button>
          <button
            className={`segment-btn${view === "list" ? " active" : ""}`}
            onClick={() => setView("list")}
          >
            List View
          </button>
        </div>
      </div>

      <div className="maps-canvas">
        {view === "map" ? (
          <MapContainer
            center={center}
            zoom={coords ? 9 : 4}
            scrollWheelZoom={false}
            className="leaflet-rounded"
            attributionControl
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors | SafeTourism Map'
            />

            {coords && (
              <>
                <Marker position={[coords.latitude, coords.longitude]}>
                  <Popup>You are here</Popup>
                </Marker>
                <Circle
                  center={[coords.latitude, coords.longitude]}
                  radius={500}
                  pathOptions={{ color: "#2563eb", fillColor: "#60a5fa", fillOpacity: 0.2 }}
                />
              </>
            )}

            {riskZones &&
              sortedHazards.map((h) => (
                <Circle
                  key={`rz-${h.id}`}
                  center={[h.lat, h.lng]}
                  radius={h.level === "heavy" ? 30000 : 15000}
                  pathOptions={{
                    color: h.level === "heavy" ? "#ef4444" : "#3b82f6",
                    fillColor: h.level === "heavy" ? "#ef4444" : "#93c5fd",
                    fillOpacity: 0.25,
                  }}
                />
              ))}

            {liveEvents &&
              sortedHazards.map((h) => (
                <CircleMarker
                  key={`ev-${h.id}`}
                  center={[h.lat, h.lng]}
                  radius={6}
                  pathOptions={{ color: h.level === "heavy" ? "#ef4444" : "#3b82f6" }}
                >
                  <Popup>
                    <div style={{ minWidth: 140 }}>
                      <div style={{ fontWeight: 700 }}>{h.name}</div>
                      <div>Precipitation: {h.precipitation.toFixed(1)} mm</div>
                      <div>Distance: {h.distance.toFixed(1)} km</div>
                      <div>Severity: {h.level}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
          </MapContainer>
        ) : (
          <div className="maps-list-placeholder">
            {loadingHazards && <div>Loading nearby events…</div>}
            {!loadingHazards && sortedHazards.length === 0 && (
              <div>No events detected nearby.</div>
            )}
            {!loadingHazards &&
              sortedHazards.map((h) => (
                <div key={h.id} className="maps-list-item">
                  <span className={`maps-dot ${h.level === "heavy" ? "red" : "amber"}`} />
                  <span style={{ marginLeft: 6, fontWeight: 600 }}>{h.name}</span>
                  <span style={{ marginLeft: 8, color: "#6b7280" }}>
                    {h.distance.toFixed(1)} km · {h.precipitation.toFixed(1)} mm
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {riskZones && (
        <div className="risk-card">
          <div className="risk-header">
            <span role="img" aria-label="shield">🛡️</span>
            <span>Risk Zones</span>
            <span className="risk-count">({sortedHazards.length})</span>
          </div>
          {sortedHazards.map((h) => (
            <div
              key={`risk-${h.id}`}
              className={`risk-item ${h.level === "heavy" ? "risk-high" : "risk-medium"}`}
            >
              <div className="risk-item-title">
                <div>
                  <div className="risk-name">{h.name}</div>
                  <span className={`risk-badge ${h.level === "heavy" ? "danger" : "warning"}`}>
                    {h.level === "heavy" ? "high" : "medium"}
                  </span>
                </div>
                <span className={`risk-dot ${h.level === "heavy" ? "red" : "amber"}`} />
              </div>
              <div className="risk-desc">Area with weather-related risks based on rainfall intensity</div>
              <div className="risk-meta">
                <span>📍 {formatKm(h.distance)}</span>
                <span>Radius: {h.level === "heavy" ? "30km" : "15km"}</span>
              </div>
            </div>
          ))}
          {sortedHazards.length === 0 && (
            <div className="risk-empty">No risk zones detected nearby</div>
          )}
        </div>
      )}

      {liveEvents && (
        <div className="events-card">
          <div className="events-header">
            <span role="img" aria-label="alert">⚠️</span>
            <span>Live Events</span>
            <span className="risk-count">({sortedHazards.length})</span>
          </div>
          {sortedHazards.map((h) => (
            <div key={`evl-${h.id}`} className="event-item">
              <div className="event-title-row">
                <div className="event-title-left">
                  <span className={`risk-dot ${h.level === "heavy" ? "red" : "amber"}`} />
                  <span className="event-title">{h.level === "heavy" ? "Flash Flood Warning" : "Rain Alert"}</span>
                </div>
                <div className="event-badges">
                  <span className="event-chip">natural disaster</span>
                  <span className={`risk-badge ${h.level === "heavy" ? "danger" : "warning"}`}>
                    {h.level === "heavy" ? "high" : "medium"}
                  </span>
                </div>
              </div>
              <div className="event-desc">
                {h.level === "heavy"
                  ? "Heavy rainfall may cause flooding in low-lying areas"
                  : "Moderate rain in the area, be cautious near water bodies"}
              </div>
              <div className="event-meta">
                <span>📍 {h.name}</span>
                <span>{formatKm(h.distance)}</span>
                <span>{nowTime()}</span>
              </div>
            </div>
          ))}
          {sortedHazards.length === 0 && (
            <div className="risk-empty">No live events right now</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="legend-card">
        <div className="legend-title">Legend</div>
        <div className="legend-grid">
          <div>
            <div className="legend-sub">Risk Levels</div>
            <div className="legend-row"><span className="legend-dot green" /> Low Risk</div>
            <div className="legend-row"><span className="legend-dot amber" /> Medium Risk</div>
            <div className="legend-row"><span className="legend-dot orange" /> High Risk</div>
            <div className="legend-row"><span className="legend-dot red" /> Critical Risk</div>
          </div>
          <div>
            <div className="legend-sub">Symbols</div>
            <div className="legend-row"><span className="legend-dot blue" /> Your Location</div>
            <div className="legend-row"><span className="legend-dot gray" /> Risk Zone</div>
            <div className="legend-row"><span className="legend-tri red">⚠️</span> Active Event</div>
          </div>
        </div>
      </div>
    </div>
  );
}
function Reviews() {
  const [reviews, setReviews] = React.useState(() => {
    const saved = localStorage.getItem("reviews");
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, name: "Sarah Johnson", place: "Central Park", days: 1, rating: 4, safety: "Very Safe", text: "Beautiful park, felt very safe during the day. Well-lit paths.", helpful: 3 },
      { id: 2, name: "Mike Chen", place: "Times Square", days: 2, rating: 3, safety: "Safe", text: "Very crowded, keep an eye on belongings. Police presence is good.", helpful: 1 },
    ];
  });
  const [showForm, setShowForm] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState("recent");

  useEffect(() => {
    localStorage.setItem("reviews", JSON.stringify(reviews));
  }, [reviews]);

  const addReview = (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim() || "Anonymous";
    const place = form.place.value.trim() || "Unknown";
    const rating = Number(form.rating.value);
    const safety = form.safety.value;
    const text = form.text.value.trim();
    if (!text) return;
    setReviews((r) => [
      { id: Date.now(), name, place, days: 0, rating, safety, text, helpful: 0 },
      ...r,
    ]);
    setShowForm(false);
    form.reset();
  };

  const filtered = reviews
    .filter((r) =>
      [r.name, r.place, r.text].join(" ").toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "safety") return (b.safety || "").localeCompare(a.safety || "");
      return b.id - a.id; // recent
    });

  const avgRating = (
    reviews.reduce((s, r) => s + r.rating, 0) / (reviews.length || 1)
  ).toFixed(1);

  return (
    <div>
      <div className="reviews-hero">
        <div>
          <div className="reviews-hero-title">Location Reviews</div>
          <div className="reviews-hero-sub">{reviews.length} reviews from travelers</div>
        </div>
        <button className="add-review-btn" onClick={() => setShowForm((v) => !v)}>+ Add Review</button>
      </div>

      {showForm && (
        <form className="review-form" onSubmit={addReview}>
          <input name="name" placeholder="Your name" />
          <input name="place" placeholder="Location" />
          <select name="rating" defaultValue="5">
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
          <select name="safety" defaultValue="Very Safe">
            <option>Very Safe</option>
            <option>Safe</option>
            <option>Risky</option>
          </select>
          <textarea name="text" placeholder="Share your experience..." rows="3" />
          <button className="submit-review" type="submit">Submit</button>
        </form>
      )}

      <div className="reviews-summary">
        <div>
          <div className="summary-title">Community Overview</div>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-icon">⭐</div>
              <div>
                <div className="summary-value">{avgRating}</div>
                <div className="summary-label">Average Rating</div>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon">🛡️</div>
              <div>
                <div className="summary-value">{avgRating}</div>
                <div className="summary-label">Safety Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="reviews-controls">
        <input className="reviews-search" placeholder="Search reviews by location or content..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="reviews-filters">
          <button className={`chip${sort === "recent" ? " active" : ""}`} onClick={() => setSort("recent")} type="button">Recent</button>
          <button className={`chip${sort === "rating" ? " active" : ""}`} onClick={() => setSort("rating")} type="button">Rating</button>
          <button className={`chip${sort === "safety" ? " active" : ""}`} onClick={() => setSort("safety")} type="button">Safety</button>
        </div>
      </div>

      {filtered.map((r) => (
        <div key={r.id} className="review-card">
          <div className="review-header">
            <div className="avatar">{r.name?.[0] || "U"}</div>
            <div className="review-head-meta">
              <div className="reviewer-name">{r.name}</div>
              <div className="review-meta-row">
                <span>📍 {r.place}</span>
                <span>•</span>
                <span>{r.days}d ago</span>
              </div>
            </div>
            <div className="review-right">
              <div className="stars" aria-label={`${r.rating} stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i}>{i < r.rating ? "⭐" : "☆"}</span>
                ))}
              </div>
              <span className={`safety-badge ${r.safety === "Very Safe" ? "green" : r.safety === "Safe" ? "amber" : "red"}`}>{r.safety}</span>
            </div>
          </div>
          <div className="review-text">{r.text}</div>
          <div className="review-actions">
            <button type="button" className="link" onClick={() => setReviews(rs => rs.map(x => x.id === r.id ? { ...x, helpful: x.helpful + 1 } : x))}>Helpful ({r.helpful})</button>
            <button type="button" className="link">Reply</button>
            <button type="button" className="link">Report</button>
          </div>
        </div>
      ))}

      <div className="guidelines-card">
        <div className="guide-title">Review Guidelines</div>
        <ul>
          <li>Share honest experiences to help fellow travelers</li>
          <li>Include specific safety tips and precautions</li>
          <li>Mention best times to visit for safety</li>
          <li>Be respectful and constructive in your feedback</li>
          <li>Report any unsafe situations to local authorities</li>
        </ul>
      </div>
    </div>
  );
}
function EmergencyHelp() {
  const [coords, setCoords] = useState(null);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const services = [
    { id: "pol-mum", name: "Tourist Police Station - Mumbai", type: "Police", phone: "100", address: "Colaba, Mumbai", lat: 18.9067, lng: 72.8147, langs: "English, Hindi, Marathi", rating: 4.2 },
    { id: "hos-mum", name: "Central Hospital Emergency - Mumbai", type: "Medical", phone: "102", address: "Parel, Mumbai", lat: 19.0043, lng: 72.8430, langs: "English, Hindi, Marathi", rating: 4.1 },
    { id: "fire-mum", name: "Fire Brigade Station - Mumbai", type: "Fire", phone: "101", address: "Byculla, Mumbai", lat: 18.9766, lng: 72.8332, langs: "English, Hindi, Marathi", rating: 4.4 },
    { id: "ngo-1098", name: "Childline 1098", type: "Ngo", phone: "1098", address: "National Helpline", lat: 19.0760, lng: 72.8777, langs: "All India", rating: 4.8 },
    { id: "res-112", name: "Emergency Services 112", type: "Rescue", phone: "112", address: "Pan-India", lat: 22.9734, lng: 78.6569, langs: "All India", rating: 5.0 },
    { id: "wom-1091", name: "Women Helpline 1091", type: "Embassy", phone: "1091", address: "Women in Distress", lat: 28.6139, lng: 77.2090, langs: "All India", rating: 4.7 }
  ];

  const hav = (a, b) => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
  }, []);

  const list = (coords ? services.map(s => ({...s, distance: hav(coords, {lat: s.lat, lng: s.lng})})) : services.map(s => ({...s, distance: 0})))
    .filter(s => (filter === "All" ? true : s.type === filter))
    .filter(s => [s.name, s.address, s.type].join(" ").toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => a.distance - b.distance);

  const goDirections = (s) => {
    if (coords) {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${s.lat},${s.lng}`);
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + " " + s.address)}`);
    }
  };
  const call = (num) => window.open(`tel:${num}`);

  const cats = ["All", "Police", "Medical", "Fire", "Embassy", "Ngo", "Rescue"];

  return (
    <div>
      <div className="help-hero">
        <div>
          <div className="help-hero-title">Emergency Help</div>
          <div className="help-hero-sub">Quick access to emergency services</div>
        </div>
        <div className="help-hero-icon">❓</div>
      </div>

      <div className="help-search-card">
        <input className="help-search" placeholder="Search emergency services..." value={query} onChange={(e)=>setQuery(e.target.value)} />
        <div className="help-filters">
          {cats.map((c)=> (
            <button key={c} className={`chip${filter===c?" active":""}`} onClick={()=>setFilter(c)} type="button">{c}</button>
          ))}
        </div>
      </div>

      {list.map((s) => (
        <div key={s.id} className="help-card">
          <div className="help-card-top">
            <div className="help-left">
              <div className="help-icon">🛡️</div>
              <div>
                <div className="help-name">{s.name}</div>
                <div className="help-badges">
                  <span className="help-type">{s.type}</span>
                  <span className="help-open">24/7</span>
                </div>
              </div>
            </div>
            <div className="help-rating">⭐ {s.rating.toFixed(1)}</div>
          </div>
          <div className="help-meta">
            <div>📞 {s.phone}</div>
            <div>📍 {s.address}</div>
            <div className="help-distance">{coords ? `${s.distance.toFixed(1)} km` : ""}</div>
            <div>🌐 Languages: {s.langs}</div>
          </div>
          <div className="help-actions">
            <button className="help-call" onClick={()=>call(s.phone)}>Call</button>
            <button className="help-dir" onClick={()=>goDirections(s)}>Directions</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function More() {
  const [coords, setCoords] = useState(null);
  const [pressId, setPressId] = useState(null);
  const [locError, setLocError] = useState("");
  const [watchId, setWatchId] = useState(null);
  const [locating, setLocating] = useState(false);

  const requestLocation = () => {
    setLocError("");
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocError(err?.message || "Unable to retrieve your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
    const id = navigator.geolocation.watchPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    if (watchId) navigator.geolocation.clearWatch(watchId);
    setWatchId(id);
  };

  useEffect(() => {
    requestLocation();
    return () => {
      if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const dial = (num) => window.open(`tel:${num}`);

  const startPress = () => {
    const id = setTimeout(() => dial("112"), 800);
    setPressId(id);
  };
  const endPress = () => {
    if (pressId) clearTimeout(pressId);
    setPressId(null);
  };

  return (
    <div>
      <div className="sos-hero">
        <div>
          <div className="sos-hero-title">Emergency SOS</div>
          <div className="sos-hero-sub">Get help when you need it most</div>
        </div>
        <div className="sos-hero-icon">⚠️</div>
      </div>

      <div className="sos-location-card">
        <div className="sos-loc-left">
          <span className="sos-loc-icon">���</span>
          <div>
            <div className="sos-loc-title">Current Location</div>
            <div className="sos-loc-sub">
              {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : locating ? "Locating…" : "Allow location access"}
            </div>
          </div>
        </div>
        <button className="sos-refresh" onClick={requestLocation}>↻</button>
      </div>
      {locError && <div className="sos-error">{locError}</div>}

      <div className="sos-critical-card">
        <div className="sos-critical-title">Critical Emergency</div>
        <div className="sos-critical-sub">Press and hold for immediate emergency response</div>
        <button
          className="sos-big-btn"
          onMouseDown={startPress}
          onMouseUp={endPress}
          onMouseLeave={endPress}
          onTouchStart={startPress}
          onTouchEnd={endPress}
          onClick={() => dial("112")}
        >
          EMERGENCY SOS
        </button>
      </div>

      <div className="sos-quick-card">
        <div className="sos-quick-title">Quick Alerts</div>
        <div className="sos-quick-sub">Send specific alerts to authorities</div>
        <button className="sos-quick-row orange" onClick={() => dial("102")}>
          <span>📞</span>
          <div>
            <div className="sos-quick-name">Medical Emergency</div>
            <div className="sos-quick-desc">Need medical assistance</div>
          </div>
          <span className="sos-num">102</span>
        </button>
        <button className="sos-quick-row purple" onClick={() => dial("100")}>
          <span>🛡️</span>
          <div>
            <div className="sos-quick-name">Security Threat</div>
            <div className="sos-quick-desc">Feeling unsafe or threatened</div>
          </div>
          <span className="sos-num">100</span>
        </button>
        <button className="sos-quick-row blue" onClick={() => dial("112")}>
          <span>📍</span>
          <div>
            <div className="sos-quick-name">Lost/Stranded</div>
            <div className="sos-quick-desc">Need help with directions</div>
          </div>
          <span className="sos-num">112</span>
        </button>
      </div>

      <div className="sos-contacts-card">
        <div className="sos-contacts-title">Emergency Contacts (India)</div>
        <div className="contact-row">
          <div>
            <div className="contact-name">Emergency Services</div>
            <div className="contact-sub">All-in-one helpline</div>
          </div>
          <button className="call-btn" onClick={() => dial("112")}>112 ☎️</button>
        </div>
        <div className="contact-row">
          <div>
            <div className="contact-name">Police</div>
            <div className="contact-sub">Report crimes or threats</div>
          </div>
          <button className="call-btn" onClick={() => dial("100")}>100 ☎️</button>
        </div>
        <div className="contact-row">
          <div>
            <div className="contact-name">Ambulance</div>
            <div className="contact-sub">Medical emergencies</div>
          </div>
          <button className="call-btn" onClick={() => dial("102")}>102 ☎️</button>
        </div>
        <div className="contact-row">
          <div>
            <div className="contact-name">Fire Brigade</div>
            <div className="contact-sub">Fire and rescue</div>
          </div>
          <button className="call-btn" onClick={() => dial("101")}>101 ☎️</button>
        </div>
        <div className="contact-row">
          <div>
            <div className="contact-name">Women Helpline</div>
            <div className="contact-sub">Support for women in distress</div>
          </div>
          <button className="call-btn" onClick={() => dial("1091")}>1091 ☎️</button>
        </div>
        <div className="contact-row">
          <div>
            <div className="contact-name">Child Helpline</div>
            <div className="contact-sub">Emergency assistance for children</div>
          </div>
          <button className="call-btn" onClick={() => dial("1098")}>1098 ☎️</button>
        </div>
      </div>

      <div className="sos-tips-card">
        <div className="sos-tips-title">Safety Tips</div>
        <ul>
          <li>Share your location with trusted contacts</li>
          <li>Keep emergency numbers easily accessible</li>
          <li>Stay aware of your surroundings</li>
          <li>Trust your instincts if something feels wrong</li>
        </ul>
      </div>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState("home");
  const [moreOpen, setMoreOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const handler = () => setChatOpen(true);
    window.addEventListener('app:openChat', handler);
    return () => window.removeEventListener('app:openChat', handler);
  }, []);

  let MainContent;
  if (tab === "home") MainContent = <Home />;
  else if (tab === "alerts") MainContent = <Alerts />;
  else if (tab === "maps") MainContent = <Maps />;
  else if (tab === "help") MainContent = <EmergencyHelp />;
  else if (tab === "reviews") MainContent = <Reviews />;
  else MainContent = <More />;

  return (
    <div>
      <div className="container">{MainContent}</div>

      {/* Side Drawer for More */}
      {moreOpen && (
        <div className="drawer-overlay" onClick={() => setMoreOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="More options">
            <div className="drawer-head">
              <div className="drawer-title">More</div>
              <button className="drawer-close" onClick={() => setMoreOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="drawer-grid">
              <button className="drawer-item" onClick={() => { setTab("reviews"); setMoreOpen(false); }}>📝 Reviews</button>
            </div>
          </div>
        </div>
      )}

      <Chatbot triggerVisible={false} rectangle open={chatOpen} onOpenChange={setChatOpen} />
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
          className={`nav-item${tab === "help" ? " active" : ""}`}
          onClick={() => setTab("help")}
        >
          <span role="img" aria-label="Help">🆘</span>
          <span>Help</span>
        </div>
        <div
          className="nav-item"
          onClick={() => setChatOpen(true)}
        >
          <span role="img" aria-label="Chat">💬</span>
          <span>Chat</span>
        </div>
        <div
          className={`nav-item${tab === "more" ? " active" : ""}`}
          onClick={() => setMoreOpen(true)}
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
