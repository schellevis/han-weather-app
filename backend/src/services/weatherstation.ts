import mqtt from 'mqtt';
import { config } from '../config';

export interface SensorReading {
  id: number | string;
  model: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  windGust?: number;
  rain?: number;
  rainTotal?: number;
  pressure?: number;
  battery?: string;
  lastSeen: string;
  raw?: Record<string, unknown>;
}

export interface WeatherStationData {
  sensors: SensorReading[];
  fetchedAt: string;
}

// In-memory store for latest readings per sensor
const sensorStore = new Map<string, SensorReading>();

// Max age before a sensor is considered stale (default 30 min)
const MAX_SENSOR_AGE_MS = 30 * 60 * 1000;

/**
 * Parse an rtl_433 JSON event and store the reading.
 * rtl_433 outputs JSON objects with varying fields depending on the sensor model.
 * Common fields: id, model, temperature_C, humidity, wind_avg_km_h, wind_dir_deg, etc.
 */
export function processRtl433Event(event: Record<string, unknown>): SensorReading | null {
  const model = String(event.model ?? 'unknown');
  const rawId = event.id ?? event.channel ?? 0;
  const id: string | number = typeof rawId === 'number' ? rawId : String(rawId);
  const sensorKey = `${model}:${id}`;

  // Check if this sensor is allowed (if filter is configured)
  if (config.rtl433SensorIds.length > 0) {
    const idStr = String(id);
    if (!config.rtl433SensorIds.includes(idStr) && !config.rtl433SensorIds.includes(sensorKey)) {
      return null;
    }
  }

  const reading: SensorReading = {
    id,
    model,
    lastSeen: new Date().toISOString(),
  };

  // Temperature (rtl_433 uses temperature_C, temperature_F, or temp_C)
  const tempC = event.temperature_C ?? event.temp_C;
  if (typeof tempC === 'number') {
    reading.temperature = tempC;
  } else if (typeof event.temperature_F === 'number') {
    reading.temperature = ((event.temperature_F as number) - 32) * 5 / 9;
  }

  // Humidity
  if (typeof event.humidity === 'number') {
    reading.humidity = event.humidity;
  }

  // Wind speed (km/h, m/s, or mph)
  const windKmh = event.wind_avg_km_h ?? event.wind_speed_km_h;
  if (typeof windKmh === 'number') {
    reading.windSpeed = windKmh;
  } else if (typeof event.wind_avg_m_s === 'number') {
    reading.windSpeed = (event.wind_avg_m_s as number) * 3.6;
  }

  // Wind gust
  const gustKmh = event.wind_max_km_h ?? event.wind_gust_km_h;
  if (typeof gustKmh === 'number') {
    reading.windGust = gustKmh;
  } else if (typeof event.wind_max_m_s === 'number') {
    reading.windGust = (event.wind_max_m_s as number) * 3.6;
  }

  // Wind direction (degrees)
  if (typeof event.wind_dir_deg === 'number') {
    reading.windDirection = event.wind_dir_deg;
  }

  // Rain (mm)
  if (typeof event.rain_mm === 'number') {
    reading.rain = event.rain_mm;
  }
  if (typeof event.rain_mm_total === 'number') {
    reading.rainTotal = event.rain_mm_total;
  } else if (typeof event.rain_total_mm === 'number') {
    reading.rainTotal = event.rain_total_mm;
  }

  // Pressure
  if (typeof event.pressure_hPa === 'number') {
    reading.pressure = event.pressure_hPa;
  }

  // Battery
  if (event.battery_ok !== undefined) {
    reading.battery = event.battery_ok === 1 ? 'OK' : 'Low';
  } else if (typeof event.battery === 'string') {
    reading.battery = event.battery;
  }

  // Store raw event for debugging
  reading.raw = event;

  sensorStore.set(sensorKey, reading);
  return reading;
}

/**
 * Get all current sensor readings, pruning stale sensors.
 */
export function getWeatherStationData(): WeatherStationData {
  const now = Date.now();
  const sensors: SensorReading[] = [];

  for (const [key, reading] of sensorStore) {
    const age = now - new Date(reading.lastSeen).getTime();
    if (age > MAX_SENSOR_AGE_MS) {
      sensorStore.delete(key);
      continue;
    }
    // Return reading without raw data to keep response clean
    const { raw: _raw, ...cleanReading } = reading;
    sensors.push(cleanReading);
  }

  return {
    sensors,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Get count of active sensors.
 */
export function getActiveSensorCount(): number {
  const now = Date.now();
  let count = 0;
  for (const reading of sensorStore.values()) {
    if (now - new Date(reading.lastSeen).getTime() <= MAX_SENSOR_AGE_MS) {
      count++;
    }
  }
  return count;
}

/**
 * Connect to the MQTT broker and subscribe to the configured topic.
 * rtl_433 should be started with: rtl_433 -F "mqtt://mqtthost:1883,retain=0,devices=rtl_433[/model][/id]"
 * Returns the MQTT client so the caller can handle cleanup.
 */
export function startMqttSubscriber(): mqtt.MqttClient {
  const client = mqtt.connect(config.mqttBrokerUrl);

  client.on('connect', () => {
    console.log(`MQTT connected to ${config.mqttBrokerUrl}`);
    client.subscribe(config.mqttTopic, (err) => {
      if (err) {
        console.error(`MQTT subscribe error for topic "${config.mqttTopic}":`, err.message);
      } else {
        console.log(`MQTT subscribed to topic: ${config.mqttTopic}`);
      }
    });
  });

  client.on('message', (_topic, payload) => {
    try {
      const event = JSON.parse(payload.toString()) as Record<string, unknown>;
      if (event && typeof event === 'object' && event.model) {
        processRtl433Event(event);
      }
    } catch {
      // Ignore non-JSON payloads
    }
  });

  client.on('error', (err) => {
    console.error('MQTT error:', err.message);
  });

  client.on('reconnect', () => {
    console.log('MQTT reconnecting...');
  });

  return client;
}
