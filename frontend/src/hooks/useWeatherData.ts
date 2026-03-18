import { useState, useEffect, useCallback } from 'react';
import type {
  MultiModelForecast,
  CurrentWeatherResponse,
  WarningsResponse,
  StookwijzerResponse,
  AirQualityResponse,
  AppConfig,
  WeatherStationResponse,
} from '../types/weather';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const search = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return search ? `${path}?${search}` : path;
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetchJson<AppConfig>('/api/config').then(setConfig).catch(console.error);
  }, []);

  return config;
}

export function useForecast(days: number = 7, lat?: number, lon?: number) {
  const [data, setData] = useState<MultiModelForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const url = buildUrl('/api/forecast', { days, lat, lon });
      const result = await fetchJson<MultiModelForecast>(url);
      setData(result);
      setError(null);
    } catch (err) {
      setError('Kan voorspelling niet laden');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [days, lat, lon]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useCurrentWeather(lat?: number, lon?: number) {
  const [data, setData] = useState<CurrentWeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const url = buildUrl('/api/current', { lat, lon });
      const result = await fetchJson<CurrentWeatherResponse>(url);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading };
}

export function useWarnings() {
  const [data, setData] = useState<WarningsResponse | null>(null);

  useEffect(() => {
    fetchJson<WarningsResponse>('/api/warnings').then(setData).catch(console.error);
    const interval = setInterval(() => {
      fetchJson<WarningsResponse>('/api/warnings').then(setData).catch(console.error);
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return data;
}

export function useStookwijzer(lat?: number, lon?: number) {
  const [data, setData] = useState<StookwijzerResponse | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const url = buildUrl('/api/stookwijzer', { lat, lon });
      const result = await fetchJson<StookwijzerResponse>(url);
      setData(result);
    } catch (err) {
      console.error(err);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return data;
}

export function useAirQuality(lat?: number, lon?: number) {
  const [data, setData] = useState<AirQualityResponse | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const url = buildUrl('/api/airquality', { lat, lon });
      const result = await fetchJson<AirQualityResponse>(url);
      setData(result);
    } catch (err) {
      console.error(err);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return data;
}

const STATION_POLL_INTERVAL = 60 * 1000; // 1 minute for live sensor data

export function useWeatherStation(enabled: boolean) {
  const [data, setData] = useState<WeatherStationResponse | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      try {
        const result = await fetchJson<WeatherStationResponse>('/api/weatherstation');
        setData(result);
      } catch {
        // Weather station not available — silent fail
      }
    };

    fetchData();
    const interval = setInterval(fetchData, STATION_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled]);

  return data;
}
