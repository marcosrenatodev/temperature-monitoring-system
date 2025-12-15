import { query } from '../config/database';

export interface IAlert {
  id?: number;
  sensor_id: string;
  alert_type: string;
  message: string;
  temperature?: number;
  humidity?: number;
  threshold_exceeded?: string;
  created_at?: Date;
}

export class AlertModel {
  static async create(alert: IAlert): Promise<IAlert> {
    const result = await query(
      `INSERT INTO alerts
       (sensor_id, alert_type, message, temperature, humidity, threshold_exceeded)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        alert.sensor_id,
        alert.alert_type,
        alert.message,
        alert.temperature || null,
        alert.humidity || null,
        alert.threshold_exceeded || null
      ]
    );
    return result.rows[0];
  }

  static async findBySensor(sensorId: string, limit: number = 50): Promise<IAlert[]> {
    const result = await query(
      `SELECT * FROM alerts
       WHERE sensor_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [sensorId, limit]
    );
    return result.rows;
  }

  static async findAll(limit: number = 100): Promise<IAlert[]> {
    const result = await query(
      `SELECT * FROM alerts
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async findRecent(minutes: number = 60): Promise<IAlert[]> {
    const result = await query(
      `SELECT * FROM alerts
       WHERE created_at > NOW() - INTERVAL '${minutes} minutes'
       ORDER BY created_at DESC`
    );
    return result.rows;
  }
}
