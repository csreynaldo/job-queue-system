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

const app = express();
const httpServer = createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

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
      startWorkerPool();
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', { error: (err as Error).message });
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await stopWorkerPool();
  httpServer.close(() => process.exit(0));
});

bootstrap();

export { app, httpServer };
