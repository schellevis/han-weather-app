export const config = {
  port: parseInt(process.env.PORT || '3100', 10),
  latitude: parseFloat(process.env.LATITUDE || '52.37'),
  longitude: parseFloat(process.env.LONGITUDE || '4.89'),
  locationName: process.env.LOCATION_NAME || 'Amsterdam',
  province: process.env.PROVINCE || 'Noord-Holland',
  knmiApiKey: process.env.KNMI_API_KEY || '',
  haWebhookUrl: process.env.HA_WEBHOOK_URL || '',

  // rtl_433 weather station support
  rtl433Enabled: process.env.RTL433_ENABLED === 'true',
  rtl433SensorIds: (process.env.RTL433_SENSOR_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  alerts: {
    checkInterval: 5 * 60 * 1000, // 5 min
  },

  cache: {
    forecastTtl: 20 * 60 * 1000,      // 20 min
    warningsTtl: 10 * 60 * 1000,      // 10 min
    stookwijzerTtl: 30 * 60 * 1000,   // 30 min
    radarTtl: 5 * 60 * 1000,          //  5 min
    airQualityTtl: 30 * 60 * 1000,   // 30 min
  },

  models: [
    'knmi_seamless',
    'icon_seamless',
    'ecmwf_ifs025',
    'gfs_seamless',
    'meteofrance_seamless',
  ] as const,
};

export type WeatherModel = (typeof config.models)[number];
