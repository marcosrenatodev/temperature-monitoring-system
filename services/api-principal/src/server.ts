import 'express-async-errors';
import dotenv from 'dotenv';
import http from 'http';

import { createApp } from './app';

dotenv.config();

(function() {
  const { logger } = require('./config/logger');
  const pool = require('./config/database').default;

  const app = createApp();
  const PORT = process.env.API_PORT || 3000;

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

  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(() => {
      logger.info('HTTP server closed');
    });

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
        logger.warn('Starting server without database connection');
      }

      server.listen(PORT, () => {
        logger.info('=================================');
        logger.info(`🚀 API Principal started (Express)`);
        logger.info(`📡 Server: http://localhost:${PORT}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`📊 Dashboard: http://localhost:${PORT}/`);
        logger.info('=================================');
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  // In tests we want to import the app without binding ports.
  if (process.env.NODE_ENV !== 'test') {
    startServer();
  }

  // Export for testing
  module.exports = { app, server };
})();
