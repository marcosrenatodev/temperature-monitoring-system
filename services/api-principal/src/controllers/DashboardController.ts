import { Request, Response } from 'express';
import { SensorModel } from '../models/Sensor';
import { ReadingModel } from '../models/Reading';
import { AlertModel } from '../models/Alert';
import { logger } from '../config/logger';

export class DashboardController {
  static async renderDashboard(req: Request, res: Response): Promise<void> {
    try {
      const sensors = await SensorModel.findAll();
      const latestReadings = await ReadingModel.getLatestReadingsGrouped();
      const recentAlerts = await AlertModel.findRecent(60);

      const sensorsWithData = sensors.map(sensor => {
        const reading = latestReadings.find(r => r.sensor_id === sensor.sensor_id);
        return {
          ...sensor,
          latest_reading: reading || null
        };
      });

      res.render('dashboard', {
        title: 'Temperature Monitoring Dashboard',
        sensors: sensorsWithData,
        alerts: recentAlerts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error rendering dashboard', error);
      res.status(500).send('Error loading dashboard');
    }
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const sensors = await SensorModel.findAll();
      const activeSensors = sensors.filter(s => s.active);
      const recentAlerts = await AlertModel.findRecent(60);
      const latestReadings = await ReadingModel.getLatestReadingsGrouped();

      res.json({
        success: true,
        data: {
          total_sensors: sensors.length,
          active_sensors: activeSensors.length,
          recent_alerts: recentAlerts.length,
          sensors_with_data: latestReadings.length
        }
      });
    } catch (error) {
      logger.error('Error fetching stats', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
