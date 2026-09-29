export type GeolocateError = 'unsupported' | 'denied' | 'unavailable';

export interface LocatedPlace {
  name: string;
  lat: number;
  lon: number;
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 5 * 60 * 1000,
    }),
  );
}

/** Device position + place name (BigDataCloud, no API key). Rejects with a GeolocateError. */
export async function locateUser(lang: string, fallbackName: string): Promise<LocatedPlace> {
  if (!('geolocation' in navigator)) throw 'unsupported' satisfies GeolocateError;
  let pos: GeolocationPosition;
  try {
    pos = await currentPosition();
  } catch (e) {
    const denied = (e as GeolocationPositionError)?.code === 1;
    throw (denied ? 'denied' : 'unavailable') satisfies GeolocateError;
  }
  const lat = Math.round(pos.coords.latitude * 10000) / 10000;
  const lon = Math.round(pos.coords.longitude * 10000) / 10000;

  let name = fallbackName;
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${encodeURIComponent(lang)}`,
    );
    if (res.ok) {
      const d = await res.json();
      const place = d.city || d.locality;
      if (place) name = d.countryName ? `${place}, ${d.countryName}` : place;
    }
  } catch {
    // The position is what matters: keep the fallback name
  }
  return { name, lat, lon };
}
