import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { forecastRouter } from './routes/forecast';
import { currentRouter } from './routes/current';
import { radarRouter } from './routes/radar';
import { warningsRouter } from './routes/warnings';
import { stookwijzerRouter } from './routes/stookwijzer';
import { airqualityRouter } from './routes/airquality';
import { weatherstationRouter } from './routes/weatherstation';
import { checkAlerts } from './services/alerts';

export const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/forecast', forecastRouter);
app.use('/api/current', currentRouter);
app.use('/api/radar', radarRouter);
app.use('/api/warnings', warningsRouter);
app.use('/api/stookwijzer', stookwijzerRouter);
app.use('/api/airquality', airqualityRouter);
app.use('/api/weatherstation', weatherstationRouter);

// Config endpoint
app.get('/api/config', (_req, res) => {
  res.json({
    latitude: config.latitude,
    longitude: config.longitude,
    locationName: config.locationName,
    province: config.province,
    models: config.models,
    rtl433Enabled: config.rtl433Enabled,
  });
});

// Serve frontend in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Manual alert check endpoint (for testing)
app.post('/api/alerts/check', async (_req, res) => {
  if (!config.haWebhookUrl) {
    res.status(400).json({ error: 'HA_WEBHOOK_URL not configured' });
    return;
  }
  await checkAlerts();
  res.json({ ok: true });
});
