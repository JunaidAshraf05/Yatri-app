async function ipFallback(signal) {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal });
    const data = await res.json();
    if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      return { lat: data.latitude, lon: data.longitude };
    }
  } catch (_) {}
  try {
    const res = await fetch('https://ipinfo.io/json?token=', { signal });
    const data = await res.json();
    if (data?.loc) {
      const [lat, lon] = data.loc.split(',').map(Number);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { lat, lon };
    }
  } catch (_) {}
  return null;
}

export function getCurrentPosition(options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }) {
  return new Promise(async (resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options?.timeout || 15000);

    const done = (v) => { clearTimeout(timer); resolve(v); };
    const fail = async (err) => {
      const ip = await ipFallback(controller.signal);
      if (ip) return done(ip);
      reject(err || new Error('Unable to retrieve your location'));
    };

    if (!('geolocation' in navigator)) {
      return fail(new Error('Geolocation not supported'));
    }
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => done({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => fail(err),
        options
      );
    } catch (e) {
      fail(e);
    }
  });
}

export function watchPosition(callback, error, options = { enableHighAccuracy: true, maximumAge: 5000 }) {
  if (!('geolocation' in navigator)) {
    if (error) error(new Error('Geolocation not supported'));
    return null;
  }
  return navigator.geolocation.watchPosition(
    (pos) => callback({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
    error,
    options
  );
}

export function clearWatch(id) {
  if (id && 'geolocation' in navigator) navigator.geolocation.clearWatch(id);
}
