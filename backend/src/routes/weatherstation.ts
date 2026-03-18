import { Router } from 'express';
import { config } from '../config';
import { getWeatherStationData } from '../services/weatherstation';

export const weatherstationRouter = Router();

/**
 * GET /api/weatherstation — Returns latest readings from all sensors.
 * Data is ingested via MQTT (rtl_433 → MQTT broker → backend subscriber).
 */
weatherstationRouter.get('/', (_req, res) => {
  if (!config.rtl433Enabled) {
    res.status(404).json({ error: 'Weather station support not enabled' });
    return;
  }
  res.json(getWeatherStationData());
});
