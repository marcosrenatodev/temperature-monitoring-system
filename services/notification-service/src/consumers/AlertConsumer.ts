import { query } from '../config/database';
import { logger } from '../config/logger';

interface SensorReading {
  sensor_id: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

interface Sensor {
  sensor_id: string;
  name: string;
  min_temperature: number;
  max_temperature: number;
  min_humidity: number;
  max_humidity: number;
}

export class AlertConsumer {
  async processReading(reading: SensorReading): Promise<void> {
    try {
      // Get sensor configuration
      const sensorResult = await query(
        'SELECT * FROM sensors WHERE sensor_id = $1',
        [reading.sensor_id]
      );

      if (sensorResult.rows.length === 0) {
        logger.warn(`Sensor not found: ${reading.sensor_id}`);
        return;
      }

      const sensor: Sensor = sensorResult.rows[0];

      // Save reading to database
      await query(
        `INSERT INTO sensor_readings (sensor_id, temperature, humidity)
         VALUES ($1, $2, $3)`,
        [reading.sensor_id, reading.temperature, reading.humidity]
      );

      logger.info(`Reading saved for sensor ${reading.sensor_id}`);

      // Check thresholds and generate alerts
      await this.checkThresholds(sensor, reading);

    } catch (error) {
      logger.error('Error processing reading:', error);
      throw error;
    }
  }

  private async checkThresholds(sensor: Sensor, reading: SensorReading): Promise<void> {
    const alerts: string[] = [];
    let alertType = 'INFO';

    // Check temperature
    if (reading.temperature < sensor.min_temperature) {
      const message = `🥶 LOW TEMPERATURE ALERT: Sensor "${sensor.name}" (${sensor.sensor_id}) - Temperature ${reading.temperature}°C is below minimum threshold of ${sensor.min_temperature}°C`;
      alerts.push(message);
      alertType = 'CRITICAL';

      await this.saveAlert({
        sensor_id: sensor.sensor_id,
        alert_type: 'LOW_TEMPERATURE',
        message,
        temperature: reading.temperature,
        humidity: reading.humidity,
        threshold_exceeded: `min_temperature: ${sensor.min_temperature}°C`
      });
    } else if (reading.temperature > sensor.max_temperature) {
      const message = `🔥 HIGH TEMPERATURE ALERT: Sensor "${sensor.name}" (${sensor.sensor_id}) - Temperature ${reading.temperature}°C exceeds maximum threshold of ${sensor.max_temperature}°C`;
      alerts.push(message);
      alertType = 'CRITICAL';

      await this.saveAlert({
        sensor_id: sensor.sensor_id,
        alert_type: 'HIGH_TEMPERATURE',
        message,
        temperature: reading.temperature,
        humidity: reading.humidity,
        threshold_exceeded: `max_temperature: ${sensor.max_temperature}°C`
      });
    }

    // Check humidity
    if (reading.humidity < sensor.min_humidity) {
      const message = `💨 LOW HUMIDITY ALERT: Sensor "${sensor.name}" (${sensor.sensor_id}) - Humidity ${reading.humidity}% is below minimum threshold of ${sensor.min_humidity}%`;
      alerts.push(message);
      alertType = 'CRITICAL';

      await this.saveAlert({
        sensor_id: sensor.sensor_id,
        alert_type: 'LOW_HUMIDITY',
        message,
        temperature: reading.temperature,
        humidity: reading.humidity,
        threshold_exceeded: `min_humidity: ${sensor.min_humidity}%`
      });
    } else if (reading.humidity > sensor.max_humidity) {
      const message = `💧 HIGH HUMIDITY ALERT: Sensor "${sensor.name}" (${sensor.sensor_id}) - Humidity ${reading.humidity}% exceeds maximum threshold of ${sensor.max_humidity}%`;
      alerts.push(message);
      alertType = 'CRITICAL';

      await this.saveAlert({
        sensor_id: sensor.sensor_id,
        alert_type: 'HIGH_HUMIDITY',
        message,
        temperature: reading.temperature,
        humidity: reading.humidity,
        threshold_exceeded: `max_humidity: ${sensor.max_humidity}%`
      });
    }

    // Log alerts to console
    if (alerts.length > 0) {
      logger.warn('='.repeat(80));
      logger.warn(`⚠️  ALERT TRIGGERED - ${alertType}`);
      alerts.forEach(alert => logger.warn(alert));
      logger.warn('='.repeat(80));
    } else {
      logger.info(`✅ Sensor "${sensor.name}" (${sensor.sensor_id}) readings within normal range: ${reading.temperature}°C, ${reading.humidity}%`);
    }
  }

  private async saveAlert(alert: {
    sensor_id: string;
    alert_type: string;
    message: string;
    temperature: number;
    humidity: number;
    threshold_exceeded: string;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO alerts (sensor_id, alert_type, message, temperature, humidity, threshold_exceeded)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          alert.sensor_id,
          alert.alert_type,
          alert.message,
          alert.temperature,
          alert.humidity,
          alert.threshold_exceeded
        ]
      );
      logger.info(`Alert saved: ${alert.alert_type} for sensor ${alert.sensor_id}`);
    } catch (error) {
      logger.error('Error saving alert:', error);
      throw error;
    }
  }
}
