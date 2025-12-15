import { query } from '../config/database';

export interface IReading {
  id?: number;
  sensor_id: string;
  temperature: number;
  humidity: number;
  timestamp?: Date;
}

export class ReadingModel {
  static async create(reading: IReading): Promise<IReading> {
    const result = await query(
      `INSERT INTO sensor_readings (sensor_id, temperature, humidity)
       VALUES ($1, $2, $3) RETURNING *`,
      [reading.sensor_id, reading.temperature, reading.humidity]
    );
    return result.rows[0];
  }

  static async findBySensor(sensorId: string, limit: number = 50): Promise<IReading[]> {
    const result = await query(
      `SELECT * FROM sensor_readings
       WHERE sensor_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [sensorId, limit]
    );
    return result.rows;
  }

  static async findLatestBySensor(sensorId: string): Promise<IReading | null> {
    const result = await query(
      `SELECT * FROM sensor_readings
       WHERE sensor_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [sensorId]
    );
    return result.rows[0] || null;
  }

  static async findAll(limit: number = 100): Promise<IReading[]> {
    const result = await query(
      `SELECT * FROM sensor_readings
       ORDER BY timestamp DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async getLatestReadingsGrouped(): Promise<any[]> {
    const result = await query(
      `SELECT DISTINCT ON (sensor_id)
       sensor_id, temperature, humidity, timestamp
       FROM sensor_readings
       ORDER BY sensor_id, timestamp DESC`
    );
    return result.rows;
  }
}
