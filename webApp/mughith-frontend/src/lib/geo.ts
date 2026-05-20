export const MAKKAH_BBOX = {
  latMin: 21.3,
  latMax: 21.5,
  lngMin: 39.74,
  lngMax: 39.92,
};

export const MAKKAH_CENTER: [number, number] = [21.3891, 39.8579];

export const isInServiceZone = (lat: number, lng: number): boolean =>
  lat >= MAKKAH_BBOX.latMin &&
  lat <= MAKKAH_BBOX.latMax &&
  lng >= MAKKAH_BBOX.lngMin &&
  lng <= MAKKAH_BBOX.lngMax;

const R = 6371;

export const haversineKm = (a: [number, number], b: [number, number]): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const donatorState = (u: {
  isAvailable: boolean;
  isBusy: boolean;
  latitude: number | null;
  longitude: number | null;
}): 'AVAILABLE' | 'BUSY' | 'OFFLINE' => {
  if (!u.isAvailable || u.latitude == null || u.longitude == null) return 'OFFLINE';
  if (u.isBusy) return 'BUSY';
  return 'AVAILABLE';
};
