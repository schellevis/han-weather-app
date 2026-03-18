import { useState } from 'react';
import type { MultiModelForecast, ModelId } from '../types/weather';
import { getWeatherInfo } from '../utils/weatherCodes';
import { formatTemp, formatPrecip, degreesToCompass, kmhToBeaufort } from '../utils/formatting';

interface DailyForecastProps {
  forecast: MultiModelForecast;
  enabledModels: Set<ModelId>;
}

interface DayData {
  date: string;
  dayLabel: string;
  minTemp: number;
  maxTemp: number;
  spreadMin: number;
  spreadMax: number;
  totalPrecip: number;
  weatherCode: number;
  consensusSpread: number;
  windDirSin: number;
  windDirCos: number;
  windDirCount: number;
  maxWindSpeed: number;
  maxFeelsLike: number;
  totalSunshine: number;
}

export function DailyForecast({ forecast, enabledModels }: DailyForecastProps) {
  const [showDays, setShowDays] = useState<7 | 14>(7);

  const models = Object.entries(forecast.models).filter(([id]) =>
    enabledModels.has(id as ModelId)
  );
  if (models.length === 0) return null;

  const [, firstModel] = models[0];
  const dayMap = new Map<string, DayData>();

  firstModel.time.forEach((time, i) => {
    const date = time.slice(0, 10);
    if (!dayMap.has(date)) {
      const d = new Date(time);
      dayMap.set(date, {
        date,
        dayLabel: d.toLocaleDateString('nl-NL', { weekday: 'short' }),
        minTemp: Infinity,
        maxTemp: -Infinity,
        spreadMin: Infinity,
        spreadMax: -Infinity,
        totalPrecip: 0,
        weatherCode: 0,
        consensusSpread: 0,
        windDirSin: 0,
        windDirCos: 0,
        windDirCount: 0,
        maxWindSpeed: 0,
        maxFeelsLike: -Infinity,
        totalSunshine: 0,
      });
    }

    const day = dayMap.get(date)!;
    const allTemps: number[] = [];
    const allWinds: number[] = [];
    const allFeels: number[] = [];
    let maxPrecip = 0;
    let sunshineSec = 0;

    for (const [, hourly] of models) {
      if (hourly.temperature_2m[i] !== undefined) {
        allTemps.push(hourly.temperature_2m[i]);
      }
      if (hourly.precipitation[i] !== undefined) {
        maxPrecip = Math.max(maxPrecip, hourly.precipitation[i]);
      }
      if (hourly.wind_speed_10m[i] !== undefined) {
        allWinds.push(hourly.wind_speed_10m[i]);
      }
      if (hourly.apparent_temperature?.[i] !== undefined) {
        allFeels.push(hourly.apparent_temperature[i]);
      }
      if (hourly.sunshine_duration?.[i] !== undefined) {
        sunshineSec += hourly.sunshine_duration[i];
      }
      // Accumulate wind direction using circular mean (sin/cos)
      if (hourly.wind_direction_10m?.[i] != null) {
        const rad = (hourly.wind_direction_10m[i] * Math.PI) / 180;
        day.windDirSin += Math.sin(rad);
        day.windDirCos += Math.cos(rad);
        day.windDirCount++;
      }
    }

    if (allWinds.length > 0) {
      const avgWind = allWinds.reduce((s, v) => s + v, 0) / allWinds.length;
      day.maxWindSpeed = Math.max(day.maxWindSpeed, avgWind);
    }
    if (allFeels.length > 0) {
      const avgFeels = allFeels.reduce((s, v) => s + v, 0) / allFeels.length;
      day.maxFeelsLike = Math.max(day.maxFeelsLike, avgFeels);
    }
    // Divide sunshine by model count (summed across all models for this hour)
    day.totalSunshine += sunshineSec / (models.length || 1);

    if (allTemps.length > 0) {
      const avg = allTemps.reduce((s, v) => s + v, 0) / allTemps.length;
      day.minTemp = Math.min(day.minTemp, avg);
      day.maxTemp = Math.max(day.maxTemp, avg);
      day.spreadMin = Math.min(day.spreadMin, ...allTemps);
      day.spreadMax = Math.max(day.spreadMax, ...allTemps);

      // Track max hourly spread for consensus
      if (allTemps.length > 1) {
        const hourSpread = Math.max(...allTemps) - Math.min(...allTemps);
        day.consensusSpread = Math.max(day.consensusSpread, hourSpread);
      }
    }

    day.totalPrecip += maxPrecip;

    const hour = new Date(time).getHours();
    if (hour === 12) {
      const codes = models.map(([, h]) => h.weather_code[i]).filter((c) => c !== undefined);
      if (codes.length > 0) {
        day.weatherCode = codes.sort((a, b) => b - a)[0];
      }
    }
  });

  const days = Array.from(dayMap.values()).slice(0, showDays);
  if (days.length === 0) return null;
  const globalMin = Math.min(...days.map((d) => d.spreadMin));
  const globalMax = Math.max(...days.map((d) => d.spreadMax));
  const tempRange = globalMax - globalMin || 1;

  return (
    <div className="card">
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <h2 className="section-title">
          {showDays === 7 ? '7-daagse' : '14-daagse'} voorspelling
        </h2>
        <div className="tab-group">
          <button
            onClick={() => setShowDays(7)}
            className={`tab ${showDays === 7 ? 'tab-active' : ''}`}
          >
            7d
          </button>
          <button
            onClick={() => setShowDays(14)}
            className={`tab ${showDays === 14 ? 'tab-active' : ''}`}
          >
            14d
          </button>
        </div>
      </div>
      <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
        {days.map((day) => {
          const weather = getWeatherInfo(day.weatherCode);
          const leftPct = ((day.spreadMin - globalMin) / tempRange) * 100;
          const widthPct = ((day.spreadMax - day.spreadMin) / tempRange) * 100;
          const avgLeftPct = ((day.minTemp - globalMin) / tempRange) * 100;
          const avgWidthPct = ((day.maxTemp - day.minTemp) / tempRange) * 100;

          // Circular mean for wind direction
          const windDeg = day.windDirCount > 0
            ? ((Math.atan2(day.windDirSin / day.windDirCount, day.windDirCos / day.windDirCount) * 180) / Math.PI + 360) % 360
            : null;
          const windCompass = windDeg !== null ? degreesToCompass(windDeg) : '';

          return (
            <div
              key={day.date}
              className="flex items-center"
              style={{
                gap: 'var(--space-sm)',
                padding: 'var(--space-sm) 0',
                fontSize: 'var(--text-sm)',
              }}
            >
              <span style={{ width: 32, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', flexShrink: 0 }}>
                {day.dayLabel}
              </span>
              <span style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>{weather.icon}</span>
              {/* Wind direction arrow */}
              {windDeg !== null && (
                <span
                  style={{
                    width: 18,
                    textAlign: 'center',
                    flexShrink: 0,
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-tertiary)',
                    display: 'inline-block',
                    transform: `rotate(${windDeg + 180}deg)`,
                    lineHeight: 1,
                  }}
                  title={`Wind ${windCompass}`}
                >
                  ↑
                </span>
              )}
              {/* Consensus dot */}
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor:
                    day.consensusSpread < 3
                      ? 'var(--color-success)'
                      : day.consensusSpread < 5
                        ? 'var(--color-warning)'
                        : 'var(--color-danger)',
                  flexShrink: 0,
                  opacity: 0.7,
                }}
                title={`Modelspreiding: ${day.consensusSpread.toFixed(1)}°`}
              />
              <span style={{ width: 36, textAlign: 'right', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                {formatTemp(day.spreadMin)}
              </span>
              <div className="flex-1 relative mx-1" style={{ height: 6, background: 'var(--color-surface-0)', borderRadius: 3 }}>
                {/* Model spread */}
                <div
                  className="absolute"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 2)}%`,
                    height: '100%',
                    borderRadius: 3,
                    background: 'var(--color-surface-2)',
                  }}
                />
                {/* Average range — gradient accent */}
                <div
                  className="absolute"
                  style={{
                    left: `${avgLeftPct}%`,
                    width: `${Math.max(avgWidthPct, 2)}%`,
                    height: '100%',
                    borderRadius: 3,
                    background: 'linear-gradient(to right, #3b82f6, #f97316)',
                  }}
                />
              </div>
              <span style={{ width: 36, color: 'var(--color-text-bright)', fontWeight: 500, flexShrink: 0 }}>
                {formatTemp(day.spreadMax)}
              </span>
              <span style={{ width: 48, textAlign: 'right', color: day.totalPrecip > 0.1 ? '#60a5fa' : 'transparent', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
                {day.totalPrecip > 0.1 ? formatPrecip(day.totalPrecip) : ''}
              </span>
              {/* Sunshine hours */}
              <span className="hidden sm:inline" style={{ width: 32, textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
                {day.totalSunshine > 0 ? `☀${Math.round(day.totalSunshine / 3600)}u` : ''}
              </span>
              {/* Wind in Beaufort */}
              <span className="hidden sm:inline" style={{ width: 32, textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
                {`${kmhToBeaufort(day.maxWindSpeed)} bft`}
              </span>
              {/* Feels-like max */}
              <span className="hidden sm:inline" style={{ width: 32, textAlign: 'right', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
                {day.maxFeelsLike > -Infinity ? formatTemp(day.maxFeelsLike) : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
