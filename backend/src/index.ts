import { app } from './app';
import { config } from './config';
import { checkAlerts } from './services/alerts';

app.listen(config.port, () => {
  console.log(`NL Weather Dashboard running on http://localhost:${config.port}`);
  console.log(`Location: ${config.locationName} (${config.latitude}, ${config.longitude})`);

  if (config.rtl433Enabled) {
    console.log('rtl_433 weather station support enabled');
    if (config.rtl433SensorIds.length > 0) {
      console.log(`  Sensor filter: ${config.rtl433SensorIds.join(', ')}`);
    }
  }

  if (config.haWebhookUrl) {
    console.log('HA alerts enabled');
    setTimeout(checkAlerts, 10_000);
    setInterval(checkAlerts, config.alerts.checkInterval);
  }
});
