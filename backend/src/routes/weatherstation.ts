import { Router } from 'express';
import { config } from '../config';
import { processRtl433Event, getWeatherStationData } from '../services/weatherstation';

export const weatherstationRouter = Router();

/**
 * GET /api/weatherstation — Returns latest readings from all sensors.
 */
weatherstationRouter.get('/', (_req, res) => {
  if (!config.rtl433Enabled) {
    res.status(404).json({ error: 'Weather station support not enabled' });
    return;
  }
  res.json(getWeatherStationData());
});

/**
 * POST /api/weatherstation — Receives rtl_433 JSON events.
 * Configure rtl_433 with: rtl_433 -F "http://host:3100/api/weatherstation"
 * Supports both single events and arrays of events.
 */
weatherstationRouter.post('/', (req, res) => {
  if (!config.rtl433Enabled) {
    res.status(404).json({ error: 'Weather station support not enabled' });
    return;
  }

  const body = req.body;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  // rtl_433 sends individual JSON objects, but we also support arrays
  const events = Array.isArray(body) ? body : [body];
  let processed = 0;

  for (const event of events) {
    if (event && typeof event === 'object' && event.model) {
      const result = processRtl433Event(event as Record<string, unknown>);
      if (result) processed++;
    }
  }

  res.json({ ok: true, processed });
});
