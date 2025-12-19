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
