import { describe, it, expect, beforeEach } from 'vitest';
import { processRtl433Event, getWeatherStationData, getActiveSensorCount } from '../../services/weatherstation';

// Reset module state between tests by clearing sensor store
// We rely on getWeatherStationData pruning stale sensors
describe('weatherstation service', () => {
  describe('processRtl433Event', () => {
    it('should parse a basic temperature/humidity sensor event', () => {
      const event = {
        model: 'Acurite-Tower',
        id: 12345,
        temperature_C: 21.5,
        humidity: 65,
        battery_ok: 1,
      };

      const result = processRtl433Event(event);
      expect(result).not.toBeNull();
      expect(result!.model).toBe('Acurite-Tower');
      expect(result!.id).toBe(12345);
      expect(result!.temperature).toBe(21.5);
      expect(result!.humidity).toBe(65);
      expect(result!.battery).toBe('OK');
    });

    it('should parse wind speed and direction', () => {
      const event = {
        model: 'Bresser-6in1',
        id: 42,
        wind_avg_km_h: 15.3,
        wind_max_km_h: 28.5,
        wind_dir_deg: 225,
      };

      const result = processRtl433Event(event);
      expect(result).not.toBeNull();
      expect(result!.windSpeed).toBe(15.3);
      expect(result!.windGust).toBe(28.5);
      expect(result!.windDirection).toBe(225);
    });

    it('should convert wind speed from m/s to km/h', () => {
      const event = {
        model: 'Generic-Weather',
        id: 1,
        wind_avg_m_s: 5,
      };

      const result = processRtl433Event(event);
      expect(result).not.toBeNull();
      expect(result!.windSpeed).toBeCloseTo(18, 0);
    });

    it('should convert Fahrenheit to Celsius', () => {
      const event = {
        model: 'LaCrosse-TX',
        id: 99,
        temperature_F: 68,
      };

      const result = processRtl433Event(event);
      expect(result).not.toBeNull();
      expect(result!.temperature).toBeCloseTo(20, 0);
    });

    it('should parse rain data', () => {
      const event = {
        model: 'Oregon-Rain',
        id: 7,
        rain_mm: 2.5,
        rain_mm_total: 150.2,
      };

      const result = processRtl433Event(event);
      expect(result).not.toBeNull();
      expect(result!.rain).toBe(2.5);
      expect(result!.rainTotal).toBe(150.2);
    });

    it('should parse pressure data', () => {
      const event = {
        model: 'Bresser-Baro',
        id: 5,
        pressure_hPa: 1013.25,
      };

      const result = processRtl433Event(event);
      expect(result).not.toBeNull();
      expect(result!.pressure).toBe(1013.25);
    });

    it('should detect low battery', () => {
      const event = {
        model: 'Acurite-Tower',
        id: 100,
        battery_ok: 0,
      };

      const result = processRtl433Event(event);
      expect(result).not.toBeNull();
      expect(result!.battery).toBe('Low');
    });

    it('should handle events with no weather data gracefully', () => {
      const event = {
        model: 'Unknown-Device',
        id: 999,
      };

      const result = processRtl433Event(event);
      expect(result).not.toBeNull();
      expect(result!.temperature).toBeUndefined();
      expect(result!.humidity).toBeUndefined();
    });
  });

  describe('getWeatherStationData', () => {
    it('should return stored sensor readings', () => {
      // First store a reading
      processRtl433Event({
        model: 'TestSensor',
        id: 1,
        temperature_C: 22,
      });

      const data = getWeatherStationData();
      expect(data.sensors.length).toBeGreaterThan(0);
      expect(data.fetchedAt).toBeTruthy();

      const testSensor = data.sensors.find(
        (s) => s.model === 'TestSensor' && s.id === 1
      );
      expect(testSensor).toBeTruthy();
      expect(testSensor!.temperature).toBe(22);
    });
  });

  describe('getActiveSensorCount', () => {
    it('should count active sensors', () => {
      processRtl433Event({
        model: 'CountTestSensor',
        id: 1,
        temperature_C: 20,
      });

      const count = getActiveSensorCount();
      expect(count).toBeGreaterThan(0);
    });
  });
});
