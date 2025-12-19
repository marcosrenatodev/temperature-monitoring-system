import 'express-async-errors';
import express from 'express';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

// IIFE Structure
(function() {
  const { logger } = require('./config/logger');
  const { connectRabbitMQ, closeRabbitMQ } = require('./config/rabbitmq');
  const { SensorSimulator } = require('./services/SensorSimulator');

  const app = express();
  const PORT = process.env.SENSOR_SERVICE_PORT || 3001;

  app.use(express.json());

  // Request logging
  app.use((req: any, _res: any, next: any) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (_req: any, res: any) => {
    res.json({
      status: 'ok',
      service: 'sensor-service',
      timestamp: new Date().toISOString()
    });
  });

  // Error handling
  app.use((err: any, _req: any, res: any, _next: any) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

  const server = http.createServer(app);

  let simulator: any = null;

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    if (simulator) {
      simulator.stop();
    }

    server.close(() => {
      logger.info('HTTP server closed');
    });

    await closeRabbitMQ();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Start server
  const startServer = async () => {
    try {
      // Connect to RabbitMQ
      await connectRabbitMQ();

      // Wait a bit for API Principal to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Start sensor simulator
      simulator = new SensorSimulator();
      await simulator.start();

      server.listen(PORT, () => {
        logger.info('=================================');
        logger.info(`🚀 Sensor Service started (Express)`);
        logger.info(`📡 Server: http://localhost:${PORT}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info('=================================');
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();

  module.exports = { app, server };
})();
