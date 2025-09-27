const WMO_MAP = {
  0: { main: 'Clear', desc: 'Clear sky' },
  1: { main: 'Mainly clear', desc: 'Mostly clear' },
  2: { main: 'Partly cloudy', desc: 'Partly cloudy' },
  3: { main: 'Overcast', desc: 'Overcast' },
  45: { main: 'Fog', desc: 'Fog' },
  48: { main: 'Depositing rime fog', desc: 'Rime fog' },
  51: { main: 'Drizzle', desc: 'Light drizzle' },
  53: { main: 'Drizzle', desc: 'Drizzle' },
  55: { main: 'Drizzle', desc: 'Dense drizzle' },
  56: { main: 'Freezing drizzle', desc: 'Light freezing drizzle' },
  57: { main: 'Freezing drizzle', desc: 'Freezing drizzle' },
  61: { main: 'Rain', desc: 'Slight rain' },
  63: { main: 'Rain', desc: 'Rain' },
  65: { main: 'Rain', desc: 'Heavy rain' },
  66: { main: 'Freezing rain', desc: 'Light freezing rain' },
  67: { main: 'Freezing rain', desc: 'Freezing rain' },
  71: { main: 'Snow', desc: 'Slight snow' },
  73: { main: 'Snow', desc: 'Snow' },
  75: { main: 'Snow', desc: 'Heavy snow' },
  77: { main: 'Snow grains', desc: 'Snow grains' },
  80: { main: 'Rain showers', desc: 'Slight rain showers' },
  81: { main: 'Rain showers', desc: 'Rain showers' },
  82: { main: 'Rain showers', desc: 'Violent rain showers' },
  85: { main: 'Snow showers', desc: 'Slight snow showers' },
  86: { main: 'Snow showers', desc: 'Heavy snow showers' },
  95: { main: 'Thunderstorm', desc: 'Thunderstorm' },
  96: { main: 'Thunderstorm', desc: 'Thunderstorm with hail' },
  99: { main: 'Thunderstorm', desc: 'Thunderstorm with heavy hail' },
};

function severityFromPrecip(mm) {
  if (mm >= 8) return 'danger';
  if (mm >= 1) return 'warning';
  return 'info';
}

async function fetchOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code&hourly=precipitation`;
  const res = await fetch(url);
  const data = await res.json();
  const current = data?.current || {};
  const code = Number(current.weather_code ?? 0);
  const map = WMO_MAP[code] || { main: 'Weather', desc: 'Current weather' };
  const precipitation = Number(current.precipitation ?? (data?.hourly?.precipitation?.[0] ?? 0));
  return {
    provider: 'open-meteo',
    tempC: Number(current.temperature_2m ?? 0),
    description: map.desc,
    main: map.main,
    precipitationMm: precipitation,
    severity: severityFromPrecip(precipitation),
    alerts: [],
  };
}

async function fetchOpenWeather(lat, lon, key) {
  const base = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
  const res = await fetch(base);
  if (!res.ok) throw new Error('openweather-failed');
  const data = await res.json();
  const precipitation = Number(data?.rain?.['1h'] ?? data?.rain?.['3h'] ?? 0);
  const w = data?.weather?.[0] || {};
  return {
    provider: 'openweather',
    tempC: Number(data?.main?.temp ?? 0),
    description: w?.description || 'Current weather',
    main: w?.main || 'Weather',
    precipitationMm: precipitation,
    severity: severityFromPrecip(precipitation),
    alerts: [],
    locationName: data?.name || undefined,
  };
}

export async function getWeather(lat, lon) {
  const key = process.env.REACT_APP_OPENWEATHER_API_KEY;
  try {
    if (key) {
      return await fetchOpenWeather(lat, lon, key);
    }
  } catch (_) {}
  return await fetchOpenMeteo(lat, lon);
}
