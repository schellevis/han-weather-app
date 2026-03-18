# 🌤️ NL Weather Dashboard

Een self-hosted weerdashboard voor Nederland dat 5 weermodellen naast elkaar toont, inclusief regenradar, KNMI-waarschuwingen, Stookwijzer-status, luchtkwaliteit, en optioneel data van je eigen weerstation via rtl_433. Ontworpen voor inbedding in Home Assistant via een iframe.

![Dashboard](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-%3E%3D20-green) ![Docker](https://img.shields.io/badge/docker-ready-blue)

## ✨ Features

- **5 weermodellen naast elkaar** — KNMI HARMONIE, ECMWF IFS, DWD ICON, NOAA GFS, Météo-France
- **Interactieve grafieken** — Temperatuur, gevoelstemperatuur, neerslagkans, wind (Beaufort) met 1d/3d/7d/14d tijdsbereik
- **Slimme weerinzichten** — Automatisch gegenereerde samenvattingen in het Nederlands
- **7- en 14-daagse voorspelling** — Met modelconsensus-indicatoren en spreiding per dag
- **KNMI-waarschuwingen** — Realtime weer-waarschuwingen met ernst-kleuren
- **Stookwijzer** — Advies over stoken (groen/geel/oranje/rood)
- **Luchtkwaliteit** — Europese AQI met PM2.5, PM10 en ozon
- **Regenradar** — Buienradar iframe-widget met historie en voorspelling
- **Eigen weerstation** — Optionele integratie met rtl_433 voor lokale sensordata
- **Home Assistant alerts** — Webhook-notificaties bij weersveranderingen
- **Meerdere locaties** — Zoek, GPS, en opgeslagen locaties in localStorage
- **Donker thema** — Volledig dark-mode UI, geoptimaliseerd voor iframe-inbedding
- **Responsive** — Werkt op desktop, tablet en mobiel

## 🏗️ Architectuur

Monorepo met twee packages:

```
weather-app/
├── backend/          Express + TypeScript API (poort 3100)
├── frontend/         React + Vite + TailwindCSS SPA (poort 5173 dev)
├── e2e/              Playwright end-to-end tests
├── Dockerfile        Multi-stage build (frontend → backend → productie)
└── docker-compose.yml
```

### Backend

Express server die externe API's proxyt en cachet:

| Service | Endpoint | Cache |
|---------|----------|-------|
| Open-Meteo Forecast | 5 modellen per uur | 20 min |
| KNMI Data Platform | Waarschuwingen | 10 min |
| Stookwijzer | Stookadvies | 30 min |
| Open-Meteo Air Quality | AQI + fijnstof | 30 min |
| Buienradar | Regenradar URLs | 5 min |
| rtl_433 (optioneel) | Eigen sensordata | Live |

### Frontend

React 18 SPA met Recharts voor datavisualisatie. Alle data-hooks pollen elke 5 minuten (weerstation elke minuut).

## 🚀 Installatie

### Vereisten

- **Node.js** ≥ 20 (of Docker)
- **npm** ≥ 9
- Optioneel: **KNMI API-key** voor waarschuwingen
- Optioneel: **RTL-SDR dongle** + **rtl_433** voor eigen weerstation

### Optie 1: Docker (aanbevolen)

De snelste manier om het dashboard te draaien:

```bash
# Clone de repository
git clone https://github.com/schellevis/han-weather-app.git
cd han-weather-app

# Start met Docker Compose
docker compose up --build -d
```

Het dashboard is nu bereikbaar op `http://localhost:3100`.

#### Docker Compose met configuratie

Maak een `.env`-bestand aan (of pas `docker-compose.yml` aan):

```env
# Locatie (standaard: Amsterdam)
LATITUDE=52.37
LONGITUDE=4.89
LOCATION_NAME=Amsterdam
PROVINCE=Noord-Holland

# Optioneel: KNMI API-key voor waarschuwingen
KNMI_API_KEY=jouw-knmi-api-key

# Optioneel: Home Assistant webhook voor alerts
HA_WEBHOOK_URL=http://homeassistant.local:8123/api/webhook/weer-alerts

# Optioneel: Eigen weerstation via rtl_433
RTL433_ENABLED=true
RTL433_SENSOR_IDS=12345,42     # Optioneel: filter op specifieke sensor-IDs
```

```yaml
# docker-compose.yml
services:
  weer:
    build: .
    ports:
      - "3100:3100"
    env_file: .env
    restart: unless-stopped
```

### Optie 2: Handmatige installatie

```bash
# Clone
git clone https://github.com/schellevis/han-weather-app.git
cd han-weather-app

# Backend installeren en starten
cd backend
npm install
npm run dev          # Development mode met hot-reload op :3100

# Frontend installeren en starten (in een nieuw terminal)
cd frontend
npm install
npm run dev          # Vite dev server op :5173, proxyt /api → :3100
```

### Optie 3: Productie build (zonder Docker)

```bash
# Frontend bouwen
cd frontend
npm install
npm run build        # Output in frontend/dist/

# Backend bouwen en starten
cd ../backend
npm install
npm run build        # Output in backend/dist/
npm start            # Serveert frontend + API op :3100
```

## ⚙️ Configuratie

### Omgevingsvariabelen

| Variabele | Standaard | Beschrijving |
|-----------|-----------|-------------|
| `PORT` | `3100` | Server poort |
| `LATITUDE` | `52.37` | Standaard breedtegraad (Amsterdam) |
| `LONGITUDE` | `4.89` | Standaard lengtegraad (Amsterdam) |
| `LOCATION_NAME` | `Amsterdam` | Standaard locatienaam |
| `PROVINCE` | `Noord-Holland` | Provincie voor KNMI-waarschuwingen |
| `KNMI_API_KEY` | _(leeg)_ | KNMI Data Platform API-key ([aanvragen](https://developer.dataplatform.knmi.nl/)) |
| `HA_WEBHOOK_URL` | _(leeg)_ | Home Assistant webhook URL voor alerts |
| `RTL433_ENABLED` | `false` | rtl_433 weerstation-ondersteuning inschakelen |
| `RTL433_SENSOR_IDS` | _(leeg)_ | Komma-gescheiden sensor-IDs om te filteren (leeg = alles) |

### KNMI API-key aanvragen

1. Ga naar [KNMI Developer Portal](https://developer.dataplatform.knmi.nl/)
2. Maak een account aan
3. Vraag een API-key aan voor het dataset `weather_warnings`
4. Stel `KNMI_API_KEY` in

### Home Assistant integratie

Voeg een iframe-kaart toe aan je Home Assistant dashboard:

```yaml
type: iframe
url: http://jouw-server:3100
aspect_ratio: 100%
```

Voor webhook-alerts, maak een automatisering aan die reageert op de webhook:

```yaml
trigger:
  - platform: webhook
    webhook_id: weer-alerts
action:
  - service: notify.notify
    data:
      title: "{{ trigger.json.title }}"
      message: "{{ trigger.json.message }}"
```

Alert-types: `knmi_warning`, `stookwijzer_change`, `weather_change`
Ernst-niveaus: `info`, `warning`, `critical`

## 📡 Eigen weerstation (rtl_433)

Het dashboard ondersteunt data van goedkope draadloze weerstations via [rtl_433](https://github.com/merbanan/rtl_433) met een RTL-SDR USB-dongle.

### Wat heb je nodig?

- **RTL-SDR USB-dongle** — Bijv. RTL2832U (€10-20 online)
- **Draadloos weerstation** — Vrijwel elk 433 MHz weerstation (Bresser, Acurite, Oregon Scientific, etc.)
- **rtl_433** — Open-source software om 433 MHz signalen te decoderen

### rtl_433 installeren

```bash
# Debian/Ubuntu
sudo apt install rtl-433

# Of vanuit broncode
git clone https://github.com/merbanan/rtl_433.git
cd rtl_433 && mkdir build && cd build
cmake .. && make && sudo make install
```

### rtl_433 configureren

Start rtl_433 en stuur data naar het dashboard via HTTP:

```bash
# Stuur alle ontvangen sensordata naar het dashboard
rtl_433 -F "http://localhost:3100/api/weatherstation"

# Met specifiek protocol (bijv. Bresser 6-in-1)
rtl_433 -R 172 -F "http://localhost:3100/api/weatherstation"

# Met meerdere outputs (console + dashboard)
rtl_433 -F json -F "http://localhost:3100/api/weatherstation"
```

### Dashboard configureren

Zet in je `.env` of `docker-compose.yml`:

```env
RTL433_ENABLED=true

# Optioneel: alleen specifieke sensoren tonen
RTL433_SENSOR_IDS=12345,67890
```

### Sensor-IDs vinden

Start rtl_433 en bekijk welke sensoren worden ontvangen:

```bash
rtl_433 -F json | jq '{model, id, temperature_C, humidity}'
```

Noteer de `model` en `id` waarden van jouw sensoren. Je kunt filteren op sensor-ID in de config, of op model:id combinaties (bijv. `Bresser-6in1:42`).

### Ondersteunde sensordata

| Veld | Beschrijving |
|------|-------------|
| Temperatuur | °C (ook Fahrenheit wordt geconverteerd) |
| Vochtigheid | Relatieve luchtvochtigheid (%) |
| Windsnelheid | km/h (m/s wordt geconverteerd) |
| Windstoot | Maximale windsnelheid |
| Windrichting | In graden (kompasrichting wordt berekend) |
| Regen | mm (totaal en per interval) |
| Luchtdruk | hPa |
| Batterij | OK / Low |

### API endpoints

```
POST /api/weatherstation    # rtl_433 stuurt data hierheen
GET  /api/weatherstation    # Frontend haalt sensordata op
```

## 🧪 Tests

```bash
# Alle tests draaien
npm test

# Backend tests apart
cd backend && npm test

# Frontend tests apart
cd frontend && npm test

# Frontend tests met UI
cd frontend && npm run test:ui

# End-to-end tests (vereist Playwright)
npx playwright install
npm run test:e2e
```

## 🌍 Weermodellen

| Model | Bron | Bereik | Kleur |
|-------|------|--------|-------|
| KNMI HARMONIE | KNMI (Nederland) | ~48u | 🟠 Oranje |
| ECMWF IFS | EU (Europees) | ~10d | 🔵 Blauw |
| DWD ICON | DWD (Duitsland) | ~7d | 🔴 Rood |
| NOAA GFS | NOAA (VS) | ~16d | 🟣 Paars |
| Météo-France | MF (Frankrijk) | ~4d | 🔵 Cyaan |

Alle modellen worden opgehaald via de [Open-Meteo API](https://open-meteo.com/) (gratis, geen API-key nodig).

## 📁 Projectstructuur

```
backend/src/
├── index.ts                 # Server startup
├── app.ts                   # Express app & routes
├── config.ts                # Configuratie & env vars
├── cache.ts                 # In-memory TTL cache
├── routes/
│   ├── forecast.ts          # GET /api/forecast
│   ├── current.ts           # GET /api/current
│   ├── warnings.ts          # GET /api/warnings
│   ├── stookwijzer.ts       # GET /api/stookwijzer
│   ├── airquality.ts        # GET /api/airquality
│   ├── radar.ts             # GET /api/radar
│   └── weatherstation.ts    # GET+POST /api/weatherstation
├── services/
│   ├── openmeteo.ts         # Open-Meteo forecast API
│   ├── knmi.ts              # KNMI waarschuwingen
│   ├── stookwijzer.ts       # Stookwijzer API
│   ├── airquality.ts        # Open-Meteo luchtkwaliteit
│   ├── alerts.ts            # Home Assistant webhooks
│   └── weatherstation.ts    # rtl_433 sensordata verwerking
└── __tests__/               # Vitest unit tests

frontend/src/
├── App.tsx                  # Root component
├── main.tsx                 # Vite entry point
├── types/weather.ts         # TypeScript interfaces
├── hooks/
│   ├── useWeatherData.ts    # Data fetching hooks (polling)
│   ├── useLocations.ts      # Locatiebeheer (localStorage)
│   └── useModelToggle.ts    # Model aan/uit toggle
├── components/
│   ├── WeatherInsights.tsx  # Slimme weerinzichten
│   ├── CurrentWeather.tsx   # Huidige condities
│   ├── DailyForecast.tsx    # 7/14-daagse voorspelling
│   ├── MultiModelChart.tsx  # Interactieve grafieken
│   ├── Warnings.tsx         # KNMI-waarschuwingen
│   ├── StookwijzerBadge.tsx # Stookwijzer badge
│   ├── RadarMap.tsx         # Buienradar iframe
│   ├── LocationPicker.tsx   # Locatiezoeker + GPS
│   ├── ModelLegend.tsx      # Model toggle legenda
│   ├── ExternalLinks.tsx    # Links naar Windy, Buienradar, etc.
│   └── WeatherStation.tsx   # Eigen weerstation data
└── utils/
    ├── colors.ts            # Kleurdefinities
    ├── formatting.ts        # Formatters (temp, wind, etc.)
    ├── weatherCodes.ts      # WMO codes → NL beschrijvingen
    ├── geocoding.ts         # Open-Meteo geocoding client
    └── insights.ts          # Weerinzichten-generator
```

## 🔧 Ontwikkeling

### Vereisten

- Node.js ≥ 20
- npm ≥ 9

### Starten

```bash
# Backend (poort 3100)
cd backend && npm install && npm run dev

# Frontend (poort 5173, proxyt /api → :3100)
cd frontend && npm install && npm run dev
```

### TypeScript controleren

```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

### Bouwen

```bash
# Docker
docker compose up --build

# Handmatig
cd frontend && npm run build
cd ../backend && npm run build && npm start
```

## 📝 Externe API's

| API | URL | Auth | Doel |
|-----|-----|------|------|
| Open-Meteo Forecast | `api.open-meteo.com` | Geen | 5 weermodellen per uur |
| Open-Meteo Geocoding | `geocoding-api.open-meteo.com` | Geen | Locatiezoeker |
| Open-Meteo Air Quality | `air-quality-api.open-meteo.com` | Geen | AQI + fijnstof |
| KNMI Data Platform | `api.dataplatform.knmi.nl` | API-key | Waarschuwingen |
| Stookwijzer | `stookwijzer.nu` | Geen | Stookadvies |
| Buienradar | `gadgets.buienradar.nl` | Geen | Regenradar widget |

## 📄 Licentie

Dit project is open-source. Weerdata is afkomstig van Open-Meteo (CC-BY-4.0) en KNMI (CC-BY-4.0).
