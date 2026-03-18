import { config } from '../config';
import { cache } from '../cache';

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  wind_direction_10m?: number[];
  weather_code: number[];
  relative_humidity_2m?: number[];
  surface_pressure?: number[];
  apparent_temperature?: number[];
  cloud_cover?: number[];
  precipitation_probability?: number[];
  uv_index?: number[];
  sunshine_duration?: number[];
}

interface OpenMeteoDaily {
  time: string[];
  sunrise: string[];
  sunset: string[];
}

interface OpenMeteoCurrentWeather {
  time: string;
  temperature: number;
  weathercode: number;
  windspeed: number;
  winddirection: number;
}

interface OpenMeteoModelResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: OpenMeteoHourly;
  daily?: OpenMeteoDaily;
  current_weather?: OpenMeteoCurrentWeather;
}

export interface MultiModelForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  models: Record<string, OpenMeteoHourly>;
  daily?: { time: string[]; sunrise: string[]; sunset: string[] };
  fetchedAt: string;
}

const HOURLY_VARS = [
  'temperature_2m',
  'precipitation',
  'precipitation_probability',
  'wind_speed_10m',
  'wind_direction_10m',
  'weather_code',
  'relative_humidity_2m',
  'surface_pressure',
  'apparent_temperature',
  'cloud_cover',
  'uv_index',
  'sunshine_duration',
].join(',');

export async function fetchMultiModelForecast(
  lat: number = config.latitude,
  lon: number = config.longitude,
  forecastDays: number = 7
): Promise<MultiModelForecast> {
  const cacheKey = `forecast:${lat}:${lon}:${forecastDays}`;
  const cached = cache.get<MultiModelForecast>(cacheKey);
  if (cached) return cached;

  const models: Record<string, OpenMeteoHourly> = {};
  let daily: OpenMeteoDaily | undefined;

  // Fetch each model separately to get per-model data
  const modelFetches = config.models.map(async (model, index) => {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: HOURLY_VARS,
      models: model,
      forecast_days: forecastDays.toString(),
      timezone: 'Europe/Amsterdam',
    });

    // Only first model needs daily data (sunrise/sunset are astronomical, not model-dependent)
    if (index === 0) {
      params.set('daily', 'sunrise,sunset');
    }

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Open-Meteo error for ${model}: ${res.status}`);
      return;
    }
    const data = (await res.json()) as OpenMeteoModelResponse;
    models[model] = data.hourly;

    // Extract daily data from first model
    if (index === 0 && data.daily) {
      daily = data.daily;
    }
  });

  await Promise.all(modelFetches);

  const result: MultiModelForecast = {
    latitude: lat,
    longitude: lon,
    timezone: 'Europe/Amsterdam',
    models,
    daily,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, config.cache.forecastTtl);
  return result;
}

export interface CurrentWeatherData {
  models: Record<string, {
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    apparentTemperature: number;
    weatherCode: number;
    cloudCover: number;
    uvIndex: number;
  }>;
  daily?: { time: string[]; sunrise: string[]; sunset: string[] };
  fetchedAt: string;
}

export async function fetchCurrentWeather(
  lat: number = config.latitude,
  lon: number = config.longitude
): Promise<CurrentWeatherData> {
  const cacheKey = `current:${lat}:${lon}`;
  const cached = cache.get<CurrentWeatherData>(cacheKey);
  if (cached) return cached;

  // Get the current hour's data from the forecast
  const forecast = await fetchMultiModelForecast(lat, lon, 1);
  // Format current hour in Amsterdam timezone to match Open-Meteo's response format
  const now = new Date();
  const amsFmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now).replace(' ', 'T');
  const currentHour = amsFmt;

  const models: CurrentWeatherData['models'] = {};

  for (const [model, hourly] of Object.entries(forecast.models)) {
    const idx = hourly.time.findIndex((t) => t === currentHour);
    const i = idx >= 0 ? idx : 0;

    models[model] = {
      temperature: hourly.temperature_2m[i],
      humidity: hourly.relative_humidity_2m?.[i] ?? 0,
      pressure: hourly.surface_pressure?.[i] ?? 0,
      windSpeed: hourly.wind_speed_10m[i],
      windDirection: hourly.wind_direction_10m?.[i] ?? 0,
      apparentTemperature: hourly.apparent_temperature?.[i] ?? hourly.temperature_2m[i],
      weatherCode: hourly.weather_code[i],
      cloudCover: hourly.cloud_cover?.[i] ?? 0,
      uvIndex: hourly.uv_index?.[i] ?? 0,
    };
  }

  const result: CurrentWeatherData = {
    models,
    daily: forecast.daily,
    fetchedAt: new Date().toISOString(),
  };
  cache.set(cacheKey, result, config.cache.forecastTtl);
  return result;
}
