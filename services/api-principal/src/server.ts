import 'express-async-errors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

(function() {
  const express = require('express');
  const tinybone = require('tinybone');
  const dust = require('dustjs-linkedin');
  const cors = require('cors');

  const { logger } = require('./config/logger');
  const routes = require('./routes/index').default;
  const pool = require('./config/database').default;

  const app = express();
  const PORT = process.env.API_PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: any, res: any, next: any) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Configure DustJS
  dust.config.cache = false;

  const viewsPath = path.join(__dirname, 'views');

  // Load dust templates
  const loadTemplates = () => {
    const templateFiles = fs.readdirSync(viewsPath);
    templateFiles.forEach((file) => {
      if (file.endsWith('.dust')) {
        const templateName = file.replace('.dust', '');
        const templatePath = path.join(viewsPath, file);
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        const compiled = dust.compile(templateContent, templateName);
        dust.loadSource(compiled);
        logger.info(`Template loaded: ${templateName}`);
      }
    });
  };

  loadTemplates();

  // Custom render function for Dust
  app.engine('dust', (filePath: string, options: any, callback: any) => {
    const templateName = path.basename(filePath, '.dust');
    dust.render(templateName, options, callback);
  });

  app.set('view engine', 'dust');
  app.set('views', viewsPath);

  // TinyBone initialization
  const server = tinybone();

  // Mount Express app on TinyBone
  server.use(app);

  // Routes
  app.use('/', routes);

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // 404 handler
  app.use((req: any, res: any) => {
    res.status(404).json({
      success: false,
      error: 'Route not found'
    });
  });

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
        logger.info(`🚀 API Principal started`);
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

  startServer();

  // Export for testing
  module.exports = { app, server };
})();
