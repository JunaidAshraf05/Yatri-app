function toIsoHoursAgo(hours) {
  const d = new Date(Date.now() - hours * 3600 * 1000);
  return d.toISOString();
}

export async function getNearbyCrimes(lat, lon) {
  const key = process.env.REACT_APP_CRIMEOMETER_API_KEY;
  if (!key) return { incidents: [], provider: 'none' };

  try {
    const url = `https://api.crimeometer.com/v1/incidents/raw-data?lat=${lat}&lon=${lon}&distance=1mi&datetime_ini=${toIsoHoursAgo(24)}&datetime_end=${new Date().toISOString()}&page=1`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', 'x-api-key': key }
    });
    if (!res.ok) throw new Error('crime-api-failed');
    const data = await res.json();
    const incidents = Array.isArray(data?.incidents) ? data.incidents : [];
    return {
      provider: 'crimeometer',
      incidents: incidents.map((i, idx) => ({
        id: i.incident_id || idx,
        offense: i.offense || i.offense_parent || 'Crime',
        description: i.incident_description || i.offense_long_description || 'Incident reported',
        location: i.address_1 || 'Nearby area',
        time: i.incident_datetime || i.report_datetime || new Date().toISOString(),
        severity: (i.crime_severity || 'warning').toLowerCase(),
      })),
    };
  } catch (_) {
    return { incidents: [], provider: 'error' };
  }
}
