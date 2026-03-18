import { config } from '../config';
import { cache } from '../cache';

export interface AirQualityData {
  current: {
    europeanAqi: number;
    pm2_5: number;
    pm10: number;
    ozone: number;
    nitrogenDioxide: number;
  };
  hourly: {
    time: string[];
    european_aqi: number[];
    pm2_5: number[];
    pm10: number[];
  };
  fetchedAt: string;
}

interface OpenMeteoAirQualityResponse {
  hourly: {
    time: string[];
    european_aqi: (number | null)[];
    pm2_5: (number | null)[];
    pm10: (number | null)[];
    ozone: (number | null)[];
    nitrogen_dioxide: (number | null)[];
  };
}

export async function fetchAirQuality(
  lat: number = config.latitude,
  lon: number = config.longitude
): Promise<AirQualityData> {
  const cacheKey = `airquality:${lat}:${lon}`;
  const cached = cache.get<AirQualityData>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: 'european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide',
    timezone: 'Europe/Amsterdam',
    forecast_days: '2',
  });

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`Air quality API error: ${res.status}`);
    // Return safe defaults on error
    const fallback: AirQualityData = {
      current: { europeanAqi: 0, pm2_5: 0, pm10: 0, ozone: 0, nitrogenDioxide: 0 },
      hourly: { time: [], european_aqi: [], pm2_5: [], pm10: [] },
      fetchedAt: new Date().toISOString(),
    };
    return fallback;
  }

  const data = (await res.json()) as OpenMeteoAirQualityResponse;

  // Find current hour's index — format in Amsterdam timezone to match API response
  const now = new Date();
  const currentHourAmsterdam = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now).replace(' ', 'T');
  const currentHour = currentHourAmsterdam;
  const idx = data.hourly.time.findIndex((t) => t === currentHour);
  const i = idx >= 0 ? idx : 0;

  const result: AirQualityData = {
    current: {
      europeanAqi: data.hourly.european_aqi[i] ?? 0,
      pm2_5: data.hourly.pm2_5[i] ?? 0,
      pm10: data.hourly.pm10[i] ?? 0,
      ozone: data.hourly.ozone[i] ?? 0,
      nitrogenDioxide: data.hourly.nitrogen_dioxide[i] ?? 0,
    },
    hourly: {
      time: data.hourly.time,
      european_aqi: data.hourly.european_aqi.map((v) => v ?? 0),
      pm2_5: data.hourly.pm2_5.map((v) => v ?? 0),
      pm10: data.hourly.pm10.map((v) => v ?? 0),
    },
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, config.cache.airQualityTtl);
  return result;
}
