import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { LatLng } from '../utils/haversine';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  async geocode(address: string): Promise<LatLng | null> {
    try {
      const response = await axios.get(NOMINATIM_URL, {
        params: { q: address, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'mugeeth-backend/0.1 (academic)' },
        timeout: 5000,
      });

      const result = response.data?.[0];
      if (!result) return null;

      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      };
    } catch (error) {
      this.logger.warn(
        `Geocoding failed for "${address}": ${(error as Error).message}`,
      );
      return null;
    }
  }
}
