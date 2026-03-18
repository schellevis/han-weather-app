# NL Weather Dashboard

Self-hosted weather dashboard for the Netherlands showing 5 weather models side-by-side, rain radar, KNMI warnings, Stookwijzer status, air quality, and optional personal weather station data via rtl_433. Designed for Home Assistant iframe embedding.

## Architecture

Monorepo with two packages:

```
weather-app/
├── backend/          Express + TypeScript API (port 3100)
├── frontend/         React + Vite + TailwindCSS SPA (port 5173 dev)
├── e2e/              Playwright end-to-end tests
├── Dockerfile        Multi-stage build (frontend → backend → production)
└── docker-compose.yml
```

### Backend (`backend/`)

Express server that proxies and caches external API data.

- **Entry:** `src/index.ts` — Express app startup, HA alert scheduling
- **App:** `src/app.ts` — Express app, route mounting, static file serving
- **Config:** `src/config.ts` — All env vars, model list, cache TTLs, rtl_433 settings
- **Cache:** `src/cache.ts` — Simple in-memory TTL cache (`MemoryCache` class)
- **Services:**
  - `services/openmeteo.ts` — Fetches 5 models from Open-Meteo API (forecast + current weather derived from forecast)
  - `services/knmi.ts` — KNMI Data Platform warnings (requires `KNMI_API_KEY`), radar URLs
  - `services/stookwijzer.ts` — Stookwijzer.nu API (fire/air quality advice)
  - `services/airquality.ts` — Open-Meteo Air Quality API (European AQI, PM2.5, PM10, ozone)
  - `services/alerts.ts` — HA webhook alerts: tracks state changes for KNMI warnings, Stookwijzer, and significant weather codes
  - `services/weatherstation.ts` — rtl_433 sensor data processing and in-memory storage
- **Routes:** `routes/forecast.ts`, `current.ts`, `warnings.ts`, `stookwijzer.ts`, `radar.ts`, `airquality.ts`, `weatherstation.ts` — All accept optional `?lat=&lon=` query params, fallback to config defaults

### Frontend (`frontend/`)

React 18 SPA with Recharts for data visualization.

- **Entry:** `src/main.tsx` → `src/App.tsx`
- **Types:** `src/types/weather.ts` — All shared TypeScript interfaces (`ModelId`, `HourlyData`, `MultiModelForecast`, `SavedLocation`, `WeatherStationSensor`, etc.)
- **Hooks:**
  - `hooks/useWeatherData.ts` — `useForecast(days, lat?, lon?)`, `useCurrentWeather(lat?, lon?)`, `useWarnings()`, `useStookwijzer(lat?, lon?)`, `useAirQuality(lat?, lon?)`, `useWeatherStation(enabled)`, `useAppConfig()` — forecast/current/warnings with 5-min polling, weather station with 1-min polling
  - `hooks/useLocations.ts` — localStorage CRUD for saved locations, GPS support, selected location state
  - `hooks/useModelToggle.ts` — Toggle weather models on/off in charts
- **Components:**
  - `components/WeatherInsights.tsx` — Smart generated weather insights in Dutch
  - `components/MultiModelChart.tsx` — Main chart (Recharts): temperature, feels-like, precipitation %, wind (bft). Time ranges: 24h/3d/7d/14d
  - `components/CurrentWeather.tsx` — Current conditions from all models
  - `components/DailyForecast.tsx` — 7/14-day strip with model spread bars
  - `components/RadarMap.tsx` — Buienradar iframe embed (dynamic lat/lon)
  - `components/Warnings.tsx` — KNMI weather warnings panel
  - `components/StookwijzerBadge.tsx` — Color-coded stookwijzer status badge
  - `components/LocationPicker.tsx` — Dropdown with search (Open-Meteo geocoding), GPS, saved locations
  - `components/ModelLegend.tsx` — Clickable model toggle legend
  - `components/ExternalLinks.tsx` — Links to Windy.com, Buienradar, Regenmelding
  - `components/WeatherStation.tsx` — Personal weather station sensor data display (rtl_433)
- **Utils:**
  - `utils/colors.ts` — Model colors, labels, stookwijzer/warning color maps
  - `utils/formatting.ts` — Temperature, wind (Beaufort), precipitation, date/time formatters
  - `utils/weatherCodes.ts` — WMO codes → Dutch descriptions + emoji icons
  - `utils/geocoding.ts` — Open-Meteo geocoding API client (NL-only)
  - `utils/insights.ts` — Smart weather insights generator (~700 lines)

## Weather Models

| ID | Label | Color |
|----|-------|-------|
| `knmi_seamless` | KNMI HARMONIE | `#FF6B00` (orange) |
| `ecmwf_ifs025` | ECMWF IFS | `#2563EB` (blue) |
| `icon_seamless` | DWD ICON | `#DC2626` (red) |
| `gfs_seamless` | NOAA GFS | `#7C3AED` (purple) |
| `meteofrance_seamless` | Météo-France | `#06B6D4` (cyan) |

## External APIs

- **Open-Meteo Forecast:** `api.open-meteo.com/v1/forecast` — Hourly data per model (no key needed)
- **Open-Meteo Geocoding:** `geocoding-api.open-meteo.com/v1/search` — Location search (NL filter, Dutch language)
- **Open-Meteo Air Quality:** `air-quality-api.open-meteo.com/v1/air-quality` — European AQI + pollutants (no key needed)
- **KNMI Data Platform:** `api.dataplatform.knmi.nl` — Weather warnings (needs `KNMI_API_KEY`)
- **Stookwijzer:** `stookwijzer.nu/api/forecast` — Fire/air quality advice (no key needed)
- **Buienradar:** `gadgets.buienradar.nl/gadget/zoommap/` — Rain radar iframe widget

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Backend server port |
| `LATITUDE` | `52.37` | Default latitude (Amsterdam) |
| `LONGITUDE` | `4.89` | Default longitude (Amsterdam) |
| `LOCATION_NAME` | `Amsterdam` | Default location display name |
| `PROVINCE` | `Noord-Holland` | Province for KNMI warnings |
| `KNMI_API_KEY` | _(empty)_ | KNMI Data Platform API key (optional) |
| `HA_WEBHOOK_URL` | _(empty)_ | Home Assistant webhook URL for alerts (optional) |
| `RTL433_ENABLED` | `false` | Enable rtl_433 weather station support |
| `RTL433_SENSOR_IDS` | _(empty)_ | Comma-separated sensor IDs to filter (empty = accept all) |

## rtl_433 Weather Station

Optional support for personal weather stations via [rtl_433](https://github.com/merbanan/rtl_433) with an RTL-SDR USB dongle.

### How it works

1. rtl_433 reads 433 MHz signals from wireless weather sensors
2. Decoded JSON events are POSTed to `POST /api/weatherstation`
3. Backend stores latest reading per sensor in memory (30-min expiry)
4. Frontend polls `GET /api/weatherstation` every minute
5. WeatherStation component displays live sensor data

### Configuration

```bash
# Enable in env
RTL433_ENABLED=true

# Start rtl_433 with HTTP output
rtl_433 -F "http://localhost:3100/api/weatherstation"
```

### Supported sensor fields

Temperature (°C/°F), humidity (%), wind speed (km/h/m/s), wind direction (deg), wind gust, rain (mm), rain total, pressure (hPa), battery status.

## Development

```bash
# Backend
cd backend && npm install && npm run dev    # tsx watch on :3100

# Frontend
cd frontend && npm install && npm run dev   # Vite on :5173, proxies /api → :3100
```

## Testing

```bash
# All tests
npm test                      # Runs backend + frontend tests

# Individual
cd backend && npm test        # Vitest (services, cache)
cd frontend && npm test       # Vitest (components, utils)
cd frontend && npm run test:ui  # Vitest with browser UI

# E2E
npx playwright install
npm run test:e2e              # Playwright dashboard tests

# Type check
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

## Build & Deploy

```bash
docker compose up --build    # Multi-stage: frontend build → backend build → node production
```

Production serves the Vite-built frontend as static files from the Express backend on port 3100.

## Key Patterns

- **Multi-location:** Locations stored in localStorage (`nl-weather-locations` key). Selected location ID in `nl-weather-selected-location`. Falls back to server config when no locations saved.
- **Caching:** All external API responses cached in-memory with configurable TTLs (5-30 min). Cache key includes lat/lon for location-specific data.
- **Polling:** Frontend hooks poll every 5 minutes via `setInterval`. Weather station polls every 1 minute.
- **HA Alerts:** Module-level state tracking in `alerts.ts`. First check after restart sets baseline (no spurious alerts). Checks run every 5 min when `HA_WEBHOOK_URL` is configured.
- **Wind:** Displayed in Beaufort scale with km/h in parentheses.
- **Precipitation:** Shown as probability percentage (neerslagkans), not mm/h.
- **Chart variables:** Temperature, Feels-like temperature, Precipitation chance (%), Wind (bft).
- **Weather station:** rtl_433 events stored in-memory per sensor (model:id key). Stale readings (>30 min) auto-pruned. No persistence across restarts.
- **Timezone handling:** Open-Meteo API responses use `Europe/Amsterdam` timezone. Backend formats current-hour lookups using `Intl.DateTimeFormat` with `Europe/Amsterdam` to ensure correct matching regardless of server timezone.

## Language

UI text is in Dutch (NL). Code, comments, and documentation in English.

## TypeScript

Both packages use strict TypeScript. Run `npx tsc --noEmit` in each package to verify. External API responses use explicit `as` type assertions.
