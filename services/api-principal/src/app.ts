import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import routes from './routes/index';
import { logger } from './config/logger';

/**
* Creates and configures the Express application.
*
* Exported for unit/integration tests so we can use supertest
* without starting the HTTP server.
*/
export function createApp() {
  const dust = require('dustjs-linkedin');

  const app = express();

  // Resolve static public dir in both dev (src) and prod (dist)
  const staticCandidates = [
    path.join(process.cwd(), 'dist', 'public'),
    path.join(process.cwd(), 'src', 'public'),
    path.join(process.cwd(), 'public'),
    path.join(__dirname, 'public'),
  ];
  const staticPublicPath = staticCandidates.find((p) => fs.existsSync(p));
  if (staticPublicPath) {
    app.use('/static', express.static(staticPublicPath));
  } else {
    logger.warn('Static public directory not found. /static will not be served.');
  }

  // TinyBone vendor dir (prefer process.cwd(), works in docker where vendor is copied to /app/vendor)
  const tinyboneCandidates = [
    path.join(process.cwd(), 'vendor', 'tinybone'),
    staticPublicPath ? path.join(staticPublicPath, 'vendor', 'tinybone') : null,
    path.resolve(__dirname, '../../../vendor/tinybone'),
  ].filter(Boolean) as string[];

  const tinybonePath = tinyboneCandidates.find((p) => fs.existsSync(p)) || null;
  if (tinybonePath) {
    app.use('/vendor/tinybone', express.static(tinybonePath));
  } else {
    logger.warn('TinyBone directory not found. /vendor/tinybone will not be served.');
  }

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware (skip during tests)
  if (process.env.NODE_ENV !== 'test') {
    app.use((req: any, _res: any, next: any) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  // Custom render function for Dust
  const viewsPath = path.join(process.cwd(), 'views');
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
    const isBodyParserSyntaxError =
    err instanceof SyntaxError &&
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as any).status === 400 &&
    'body' in err;

    if (isBodyParserSyntaxError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON body',
      });
    }

    logger.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  // 404 handler
  app.use((_req: any, res: any) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  return app;
}

export default createApp();
