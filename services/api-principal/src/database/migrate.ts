import { query } from '../config/database';
import { logger } from '../config/logger';
import dotenv from 'dotenv';

dotenv.config();

const migrations = [
  `
    CREATE TABLE IF NOT EXISTS sensors (
      id SERIAL PRIMARY KEY,
      sensor_id VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      min_temperature DECIMAL(5,2) NOT NULL,
      max_temperature DECIMAL(5,2) NOT NULL,
      min_humidity DECIMAL(5,2) NOT NULL,
      max_humidity DECIMAL(5,2) NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id SERIAL PRIMARY KEY,
      sensor_id VARCHAR(100) NOT NULL,
      temperature DECIMAL(5,2) NOT NULL,
      humidity DECIMAL(5,2) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id) ON DELETE CASCADE
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      sensor_id VARCHAR(100) NOT NULL,
      alert_type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      temperature DECIMAL(5,2),
      humidity DECIMAL(5,2),
      threshold_exceeded VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id) ON DELETE CASCADE
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id
    ON sensor_readings(sensor_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp
    ON sensor_readings(timestamp DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_alerts_sensor_id
    ON alerts(sensor_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_alerts_created_at
    ON alerts(created_at DESC);
  `
];

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    for (let i = 0; i < migrations.length; i++) {
      logger.info(`Running migration ${i + 1}/${migrations.length}`);
      await query(migrations[i]);
    }

    logger.info('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  }
}

runMigrations();
