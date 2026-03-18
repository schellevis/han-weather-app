import { app } from './app';
import { config } from './config';
import { checkAlerts } from './services/alerts';
import { startMqttSubscriber } from './services/weatherstation';

const server = app.listen(config.port, () => {
  console.log(`NL Weather Dashboard running on http://localhost:${config.port}`);
  console.log(`Location: ${config.locationName} (${config.latitude}, ${config.longitude})`);

  if (config.rtl433Enabled) {
    console.log('rtl_433 weather station support enabled (MQTT)');
    console.log(`  Broker: ${config.mqttBrokerUrl}, topic: ${config.mqttTopic}`);
    if (config.rtl433SensorIds.length > 0) {
      console.log(`  Sensor filter: ${config.rtl433SensorIds.join(', ')}`);
    }
    const mqttClient = startMqttSubscriber();
    const shutdown = () => {
      mqttClient.end();
      server.close(() => process.exit(0));
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  }

  if (config.haWebhookUrl) {
    console.log('HA alerts enabled');
    setTimeout(checkAlerts, 10_000);
    setInterval(checkAlerts, config.alerts.checkInterval);
  }
});
