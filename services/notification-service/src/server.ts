import 'express-async-errors';
import express from 'express';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

// IIFE Structure
(function() {
  const { logger } = require('./config/logger');
  const pool = require('./config/database').default;
  const { connectRabbitMQ, consumeMessages, closeRabbitMQ } = require('./config/rabbitmq');
  const { AlertConsumer } = require('./consumers/AlertConsumer');

  const app = express();
  const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3002;

  // Middleware
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
      service: 'notification-service',
      timestamp: new Date().toISOString()
    });
  });

  // Stats endpoint
  app.get('/api/stats', async (_req: any, res: any) => {
    try {
      const alertsResult = await pool.query(
        `SELECT COUNT(*) as total_alerts FROM alerts`
      );
      const recentAlertsResult = await pool.query(
        `SELECT COUNT(*) as recent_alerts FROM alerts
         WHERE created_at > NOW() - INTERVAL '1 hour'`
      );

      res.json({
        success: true,
        data: {
          total_alerts: parseInt(alertsResult.rows[0].total_alerts),
          recent_alerts: parseInt(recentAlertsResult.rows[0].recent_alerts)
        }
      });
    } catch (error) {
      logger.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Error handling
  app.use((err: any, _req: any, res: any, _next: any) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

  // Create HTTP server (TinyBone-compatible approach)
  const server = http.createServer(app);

  // Database connection check
  const checkDatabase = async () => {
    try {
      await pool.query('SELECT NOW()');
      logger.info('Database connection successful');
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      return false;
    }
  };

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(() => {
      logger.info('HTTP server closed');
    });

    await closeRabbitMQ();

    try {
      await pool.end();
      logger.info('Database pool closed');
    } catch (error) {
      logger.error('Error closing database pool:', error);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Start server
  const startServer = async () => {
    try {
      // Check database connection
      const dbReady = await checkDatabase();
      if (!dbReady) {
        throw new Error('Database not ready');
      }

      // Connect to RabbitMQ
      await connectRabbitMQ();

      // Start consuming messages
      const alertConsumer = new AlertConsumer();
      await consumeMessages(async (message: any) => {
        await alertConsumer.processReading(message);
      });

      server.listen(PORT, () => {
        logger.info('=================================');
        logger.info(`🚀 Notification Service started (Express)`);
        logger.info(`📡 Server: http://localhost:${PORT}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`📨 Listening for messages...`);
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
