import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { config } from '../config';
import { logger } from '../config/logger';
import { connectRedis } from '../config/redis';
import { connectDB } from '../db/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import healthRoutes from './routes/health.routes';
import jobsRoutes from './routes/jobs.routes';
import metricsRoutes from './routes/metrics.routes';
import { startWorkerPool, stopWorkerPool } from '../queue/workers/workerPool';
import { initSocketServer } from '../websocket/jobSocket';
import rateLimit from 'express-rate-limit';

const app = express();
const httpServer = createServer(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.socket.io'],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", 'ws:', 'wss:', 'http://localhost:3000'],
      },
    },
  }),
);
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);
app.use(limiter);

app.use(express.static(path.join(__dirname, '../public')));

app.use('/health', healthRoutes);
app.use('/jobs', jobsRoutes);
app.use('/metrics', metricsRoutes);

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.use(notFound);
app.use(errorHandler);

const bootstrap = async (): Promise<void> => {
  try {
    await connectRedis();
    await connectDB();

    initSocketServer(httpServer);

    httpServer.listen(config.app.port, () => {
      logger.info(`🚀 Server running on http://localhost:${config.app.port}`);
      logger.info(`📋 Dashboard: http://localhost:${config.app.port}/dashboard.html`);
      logger.info(`📊 Metrics: http://localhost:${config.app.port}/metrics`);
      logger.info(`🔌 WebSocket ready on ws://localhost:${config.app.port}`);
      // In production, run the worker pool in a separate process/container.
      if (config.app.isDev) {
        startWorkerPool();
      } else {
        logger.info('Worker pool is started separately in production');
      }
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', { error: (err as Error).message });
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Shutdown timeout')), 15000),
  );
  try {
    await Promise.race([stopWorkerPool(), timeout]);
  } catch (err) {
    logger.error('Worker pool shutdown timed out or failed', { error: (err as Error).message });
  }
  httpServer.close(() => process.exit(0));
});

bootstrap();

export { app, httpServer };
