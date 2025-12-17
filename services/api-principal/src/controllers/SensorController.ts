import { Request, Response } from 'express';
import { SensorModel, ISensor } from '../models/Sensor';
import { ReadingModel } from '../models/Reading';
import { AlertModel } from '../models/Alert';
import { logger } from '../config/logger';

export class SensorController {
  static async createSensor(req: Request, res: Response): Promise<void> {
    try {
      const { sensor_id, name, location, min_temperature, max_temperature, min_humidity, max_humidity } = req.body;

      if (!sensor_id || !name || min_temperature === undefined || max_temperature === undefined ||
          min_humidity === undefined || max_humidity === undefined) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
        return;
      }

      const existing = await SensorModel.findById(sensor_id);
      if (existing) {
        res.status(409).json({
          success: false,
          error: 'Sensor with this ID already exists'
        });
        return;
      }

      const sensor: ISensor = {
        sensor_id,
        name,
        location,
        min_temperature: parseFloat(min_temperature),
        max_temperature: parseFloat(max_temperature),
        min_humidity: parseFloat(min_humidity),
        max_humidity: parseFloat(max_humidity)
      };

      const created = await SensorModel.create(sensor);
      logger.info(`Sensor created: ${sensor_id}`);

      res.status(201).json({
        success: true,
        data: created
      });
    } catch (error) {
      logger.error('Error creating sensor', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getAllSensors(_req: Request, res: Response): Promise<void> {
    try {
      const sensors = await SensorModel.findAll();
      res.json({
        success: true,
        data: sensors,
        count: sensors.length
      });
    } catch (error) {
      logger.error('Error fetching sensors', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getSensorById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sensor = await SensorModel.findById(id);

      if (!sensor) {
        res.status(404).json({
          success: false,
          error: 'Sensor not found'
        });
        return;
      }

      res.json({
        success: true,
        data: sensor
      });
    } catch (error) {
      logger.error('Error fetching sensor', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async updateSensor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const sensor = await SensorModel.findById(id);
      if (!sensor) {
        res.status(404).json({
          success: false,
          error: 'Sensor not found'
        });
        return;
      }

      const updated = await SensorModel.update(id, updates);
      logger.info(`Sensor updated: ${id}`);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      logger.error('Error updating sensor', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async deleteSensor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const sensor = await SensorModel.findById(id);
      if (!sensor) {
        res.status(404).json({
          success: false,
          error: 'Sensor not found'
        });
        return;
      }

      await SensorModel.delete(id);
      logger.info(`Sensor deleted: ${id}`);

      res.json({
        success: true,
        message: 'Sensor deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting sensor', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getSensorReadings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const sensor = await SensorModel.findById(id);
      if (!sensor) {
        res.status(404).json({
          success: false,
          error: 'Sensor not found'
        });
        return;
      }

      const readings = await ReadingModel.findBySensor(id, limit);

      res.json({
        success: true,
        data: readings,
        count: readings.length
      });
    } catch (error) {
      logger.error('Error fetching readings', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getSensorAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const sensor = await SensorModel.findById(id);
      if (!sensor) {
        res.status(404).json({
          success: false,
          error: 'Sensor not found'
        });
        return;
      }

      const alerts = await AlertModel.findBySensor(id, limit);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      logger.error('Error fetching alerts', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
