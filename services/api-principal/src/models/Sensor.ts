import { query } from '../config/database';

export interface ISensor {
  id?: number;
  sensor_id: string;
  name: string;
  location?: string;
  min_temperature: number;
  max_temperature: number;
  min_humidity: number;
  max_humidity: number;
  active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class SensorModel {
  static async create(sensor: ISensor): Promise<ISensor> {
    const result = await query(
      `INSERT INTO sensors
       (sensor_id, name, location, min_temperature, max_temperature,
        min_humidity, max_humidity, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        sensor.sensor_id,
        sensor.name,
        sensor.location || null,
        sensor.min_temperature,
        sensor.max_temperature,
        sensor.min_humidity,
        sensor.max_humidity,
        sensor.active !== undefined ? sensor.active : true
      ]
    );
    return result.rows[0];
  }

  static async findAll(): Promise<ISensor[]> {
    const result = await query('SELECT * FROM sensors ORDER BY created_at DESC');
    return result.rows;
  }

  static async findById(sensorId: string): Promise<ISensor | null> {
    const result = await query(
      'SELECT * FROM sensors WHERE sensor_id = $1',
      [sensorId]
    );
    return result.rows[0] || null;
  }

  static async update(sensorId: string, updates: Partial<ISensor>): Promise<ISensor | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'sensor_id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(sensorId);

    const result = await query(
      `UPDATE sensors SET ${fields.join(', ')} WHERE sensor_id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(sensorId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM sensors WHERE sensor_id = $1',
      [sensorId]
    );
    return (result.rowCount || 0) > 0;
  }

  static async findActive(): Promise<ISensor[]> {
    const result = await query(
      'SELECT * FROM sensors WHERE active = true ORDER BY created_at DESC'
    );
    return result.rows;
  }
}
