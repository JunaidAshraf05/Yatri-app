function withinUS(lat, lon) {
  return lat >= 18 && lat <= 72 && lon >= -172 && lon <= -66; // rough bbox
}

export async function getCriticalAlerts(lat, lon) {
  const out = [];

  // Try US NWS alerts when in the US
  if (withinUS(lat, lon)) {
    try {
      const res = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
        headers: { 'Accept': 'application/geo+json' }
      });
      if (res.ok) {
        const data = await res.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        for (const f of features.slice(0, 5)) {
          const props = f.properties || {};
          out.push({
            id: f.id || props.id || props.event,
            title: props.event || 'Weather Alert',
            severity: (props.severity || 'moderate').toLowerCase(),
            description: props.headline || props.description || 'Weather alert in your area',
            location: props.areaDesc || 'Your Area',
            sent: props.sent || props.effective || props.onset || new Date().toISOString(),
            source: 'NWS',
          });
        }
      }
    } catch (_) {}
  }

  return out;
}
