import 'express-async-errors';
import dotenv from 'dotenv';

dotenv.config();

// IIFE Structure
(function() {
  const express = require('express');
  const tinybone = require('tinybone');

  const { logger } = require('./config/logger');
  const { connectRabbitMQ, closeRabbitMQ } = require('./config/rabbitmq');
  const { SensorSimulator } = require('./services/SensorSimulator');

  const app = express();
  const PORT = process.env.SENSOR_SERVICE_PORT || 3001;

  // Middleware
  app.use(express.json());

  // Request logging
  app.use((req: any, res: any, next: any) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      service: 'sensor-service',
      timestamp: new Date().toISOString()
    });
  });

  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

  // TinyBone initialization
  const server = tinybone();
  server.use(app);

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
        logger.info(`🚀 Sensor Service started`);
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
