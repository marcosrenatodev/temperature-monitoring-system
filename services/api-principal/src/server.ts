import 'express-async-errors';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import http from 'http';

dotenv.config();

// IIFE Structure - TinyBone pattern (using Express as base since TinyBone is just a thin wrapper)
(function() {
  const dust = require('dustjs-linkedin');

  const { logger } = require('./config/logger');
  const routes = require('./routes/index').default;
  const pool = require('./config/database').default;

  const app = express();
  const PORT = process.env.API_PORT || 3000;

  // --- Static assets (TinyBone is client-side: served to the browser, never required in Node) ---
  // In dev (ts-node), __dirname points to /src. In prod (dist), __dirname points to /dist.
  const staticPublicPath = path.join(__dirname, 'public');
  if (fs.existsSync(staticPublicPath)) {
    app.use('/static', express.static(staticPublicPath));
  }

  // TinyBone vendor path:
  // - dev: repo-root/vendor/tinybone
  // - prod: dist/public/vendor/tinybone (copied by Dockerfile)
  const repoRootVendorTinybone = path.resolve(__dirname, '../../../vendor/tinybone');
  const distVendorTinybone = path.join(staticPublicPath, 'vendor', 'tinybone');
  const tinybonePath = fs.existsSync(distVendorTinybone)
    ? distVendorTinybone
    : (fs.existsSync(repoRootVendorTinybone) ? repoRootVendorTinybone : null);
  if (tinybonePath) {
    app.use('/vendor/tinybone', express.static(tinybonePath));
  }

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: any, _res: any, next: any) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Configure DustJS
  // dust.config.cache = false;

  const viewsPath = path.join(process.cwd(), 'views');

  // Load dust templates
  // const loadTemplates = () => {
  //   if (!fs.existsSync(viewsPath)) {
  //     logger.warn(`Views directory not found: ${viewsPath}`);
  //     return;
  //   }

  //   const templateFiles = fs.readdirSync(viewsPath);
  //   templateFiles.forEach((file) => {
  //     if (file.endsWith('.dust')) {
  //       const templateName = file.replace('.dust', '');
  //       const templatePath = path.join(viewsPath, file);
  //       const templateContent = fs.readFileSync(templatePath, 'utf8');
  //       const compiled = dust.compile(templateContent, templateName);
  //       dust.loadSource(compiled);
  //       logger.info(`Template loaded: ${templateName}`);
  //     }
  //   });
  // };

  // loadTemplates();

  // Custom render function for Dust
  app.engine('dust', (filePath: string, options: any, callback: any) => {
  try {
    const templateContent = fs.readFileSync(filePath, 'utf8');

    // Render direto da source: não depende de registry/cache
    dust.renderSource(templateContent, options, callback);
  } catch (err) {
    callback(err);
  }
  });

  app.set('view engine', 'dust');
  app.set('views', viewsPath);

  // Routes
  app.use('/', routes);

  // Error handling middleware
  app.use((err: any, _req: any, res: any, _next: any) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // 404 handler
  app.use((_req: any, res: any) => {
    res.status(404).json({
      success: false,
      error: 'Route not found'
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
        logger.info(`🚀 API Principal started (TinyBone/Express)`);
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
