import {
  estimateEtaMinutes,
  haversineDistanceKm,
} from '../src/common/utils/haversine';

describe('ETA + distance helpers', () => {
  describe('haversineDistanceKm', () => {
    it('returns 0 for identical coords', () => {
      const d = haversineDistanceKm(
        { latitude: 21.4225, longitude: 39.8262 },
        { latitude: 21.4225, longitude: 39.8262 },
      );
      expect(d).toBeCloseTo(0, 3);
    });

    it('computes ~0.5 km for very close points', () => {
      const d = haversineDistanceKm(
        { latitude: 21.4225, longitude: 39.8262 },
        { latitude: 21.427, longitude: 39.8262 },
      );
      expect(d).toBeGreaterThan(0.45);
      expect(d).toBeLessThan(0.55);
    });

    it('computes Makkah to Jeddah distance (~65-80km)', () => {
      const d = haversineDistanceKm(
        { latitude: 21.4225, longitude: 39.8262 },
        { latitude: 21.4858, longitude: 39.1925 },
      );
      expect(d).toBeGreaterThan(60);
      expect(d).toBeLessThan(90);
    });

    it('is symmetric', () => {
      const a = { latitude: 24.7136, longitude: 46.6753 };
      const b = { latitude: 24.5, longitude: 46.5 };
      expect(haversineDistanceKm(a, b)).toBeCloseTo(
        haversineDistanceKm(b, a),
        6,
      );
    });

    it('handles antipodal points', () => {
      const d = haversineDistanceKm(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 180 },
      );
      expect(d).toBeGreaterThan(19_000);
      expect(d).toBeLessThan(20_100);
    });
  });

  describe('estimateEtaMinutes', () => {
    it('returns 0 for zero distance', () => {
      expect(estimateEtaMinutes(0)).toBe(0);
    });

    it('returns ~15 minutes for 10km at 40km/h average', () => {
      expect(estimateEtaMinutes(10)).toBe(15);
    });

    it('returns ~75 minutes for 50km', () => {
      expect(estimateEtaMinutes(50)).toBe(75);
    });

    it('rounds to integer minutes', () => {
      const value = estimateEtaMinutes(3.3);
      expect(Number.isInteger(value)).toBe(true);
    });
  });
});
