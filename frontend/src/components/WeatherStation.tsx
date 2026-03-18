import type { WeatherStationResponse } from '../types/weather';
import { formatTempFull, formatWindFull, formatHumidity, formatPressure, degreesToCompass } from '../utils/formatting';

interface WeatherStationProps {
  data: WeatherStationResponse;
}

function formatAge(lastSeen: string): string {
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s geleden`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m geleden`;
  return `${Math.floor(diffMin / 60)}u geleden`;
}

export function WeatherStation({ data }: WeatherStationProps) {
  if (data.sensors.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>
          📡 Weerstation
        </h2>
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
          Geen sensoren actief — wacht op data van rtl_433
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="section-title" style={{ marginBottom: 'var(--space-lg)' }}>
        📡 Weerstation
      </h2>
      <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
        {data.sensors.map((sensor) => (
          <div
            key={`${sensor.model}:${sensor.id}`}
            style={{
              padding: 'var(--space-md)',
              background: 'var(--color-surface-1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Sensor header */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {sensor.model}
                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: 6 }}>
                  #{String(sensor.id)}
                </span>
              </span>
              <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                {sensor.battery && (
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: sensor.battery === 'OK' ? 'var(--color-success)' : 'var(--color-danger)',
                    }}
                  >
                    🔋 {sensor.battery}
                  </span>
                )}
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {formatAge(sensor.lastSeen)}
                </span>
              </div>
            </div>

            {/* Sensor readings grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 'var(--space-sm)' }}>
              {sensor.temperature !== undefined && (
                <div>
                  <p className="stat-label">Temperatuur</p>
                  <p style={{ color: 'var(--color-text-bright)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                    {formatTempFull(sensor.temperature)}
                  </p>
                </div>
              )}
              {sensor.humidity !== undefined && (
                <div>
                  <p className="stat-label">Vochtigheid</p>
                  <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                    {formatHumidity(sensor.humidity)}
                  </p>
                </div>
              )}
              {sensor.windSpeed !== undefined && (
                <div>
                  <p className="stat-label">Wind</p>
                  <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                    {formatWindFull(sensor.windSpeed)}
                    {sensor.windDirection !== undefined && (
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginLeft: 4 }}>
                        {degreesToCompass(sensor.windDirection)}
                      </span>
                    )}
                  </p>
                </div>
              )}
              {sensor.windGust !== undefined && (
                <div>
                  <p className="stat-label">Windstoot</p>
                  <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {formatWindFull(sensor.windGust)}
                  </p>
                </div>
              )}
              {sensor.pressure !== undefined && (
                <div>
                  <p className="stat-label">Luchtdruk</p>
                  <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {formatPressure(sensor.pressure)}
                  </p>
                </div>
              )}
              {sensor.rainTotal !== undefined && (
                <div>
                  <p className="stat-label">Regen totaal</p>
                  <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {sensor.rainTotal.toFixed(1)} mm
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
