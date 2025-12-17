import axios from 'axios';
import { publishMessage } from '../config/rabbitmq';
import { logger } from '../config/logger';

interface Sensor {
  sensor_id: string;
  name: string;
  min_temperature: number;
  max_temperature: number;
  min_humidity: number;
  max_humidity: number;
  active: boolean;
}

export class SensorSimulator {
  private sensors: Sensor[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private readonly apiUrl: string;
  private readonly intervalMs: number;

  constructor() {
    this.apiUrl = process.env.API_PRINCIPAL_URL || 'http://localhost:3000';
    this.intervalMs = parseInt(process.env.SENSOR_INTERVAL_MS || '5000');
  }

  async fetchActiveSensors(): Promise<void> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/sensors`);

      if (response.data.success) {
        this.sensors = response.data.data
        .filter((s: Sensor) => s.active)
        .map((s: any) => ({
          ...s,
          min_temperature: Number(s.min_temperature),
          max_temperature: Number(s.max_temperature),
          min_humidity: Number(s.min_humidity),
          max_humidity: Number(s.max_humidity),
        }));
        logger.info(`Fetched ${this.sensors.length} active sensors`);
      }
    } catch (error) {
      logger.error('Failed to fetch sensors from API:', error);
    }
  }

  private generateReading(sensor: Sensor) {
    if (
      Number.isNaN(sensor.min_temperature) ||
      Number.isNaN(sensor.max_temperature)
    ) {
      throw new Error(`Invalid numeric configuration for sensor ${sensor.sensor_id}`);
    }
    // Generate temperature within sensor limits with some variation
    const tempRange = sensor.max_temperature - sensor.min_temperature;
    const tempVariation = tempRange * 0.3; // 30% variation range
    const tempCenter = (sensor.min_temperature + sensor.max_temperature) / 2;

    // Occasionally exceed limits (10% chance) to trigger alerts
    const shouldExceedTemp = Math.random() < 0.1;
    let temperature: number;

    if (shouldExceedTemp) {
      temperature = Math.random() < 0.5
      ? sensor.min_temperature - Math.random() * 5
      : sensor.max_temperature + Math.random() * 5;
    } else {
      temperature = tempCenter + (Math.random() - 0.5) * tempVariation;
    }

    // Generate humidity within sensor limits with some variation
    const humRange = sensor.max_humidity - sensor.min_humidity;
    const humVariation = humRange * 0.3;
    const humCenter = (sensor.min_humidity + sensor.max_humidity) / 2;

    const shouldExceedHum = Math.random() < 0.1;
    let humidity: number;

    if (shouldExceedHum) {
      humidity = Math.random() < 0.5
      ? sensor.min_humidity - Math.random() * 10
      : sensor.max_humidity + Math.random() * 10;
    } else {
      humidity = humCenter + (Math.random() - 0.5) * humVariation;
    }

    return {
      sensor_id: sensor.sensor_id,
      temperature: parseFloat(temperature.toFixed(2)),
      humidity: parseFloat(humidity.toFixed(2)),
      timestamp: new Date().toISOString()
    };
  }

  private async simulateReadings(): Promise<void> {
    if (this.sensors.length === 0) {
      logger.debug('No active sensors to simulate');
      return;
    }

    for (const sensor of this.sensors) {
      try {
        const reading = this.generateReading(sensor);

        const published = await publishMessage(reading);

        if (published) {
          logger.info(`Reading published for sensor ${sensor.sensor_id}: ${reading.temperature}°C, ${reading.humidity}%`);
        }
      } catch (error) {
        logger.error(`Failed to simulate reading for sensor ${sensor.sensor_id}:`, error);
      }
    }
  }

  async start(): Promise<void> {
    logger.info('Starting sensor simulator...');

    // Initial fetch
    await this.fetchActiveSensors();

    // Fetch sensors periodically (every 30 seconds)
    setInterval(() => {
      this.fetchActiveSensors();
    }, 30000);

    // Simulate readings at configured interval
    this.intervalId = setInterval(() => {
      this.simulateReadings();
    }, this.intervalMs);

    logger.info(`Sensor simulator started (interval: ${this.intervalMs}ms)`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Sensor simulator stopped');
    }
  }
}
