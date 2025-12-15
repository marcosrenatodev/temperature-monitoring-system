import { Router } from 'express';
import { SensorController } from '../controllers/SensorController';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();

// Dashboard routes
router.get('/', DashboardController.renderDashboard);
router.get('/api/stats', DashboardController.getStats);

// Sensor routes
router.post('/api/sensors', SensorController.createSensor);
router.get('/api/sensors', SensorController.getAllSensors);
router.get('/api/sensors/:id', SensorController.getSensorById);
router.put('/api/sensors/:id', SensorController.updateSensor);
router.delete('/api/sensors/:id', SensorController.deleteSensor);

// Sensor readings and alerts
router.get('/api/sensors/:id/readings', SensorController.getSensorReadings);
router.get('/api/sensors/:id/alerts', SensorController.getSensorAlerts);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-principal', timestamp: new Date().toISOString() });
});

export default router;
