import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from '../config';
import { logger } from '../config/logger';
import { connectRedis } from '../config/redis';
import { connectDB } from '../db/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import healthRoutes from './routes/health.routes';
import jobsRoutes from './routes/jobs.routes';
import { startWorkerPool, stopWorkerPool } from '../queue/workers/workerPool';

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/health', healthRoutes);
app.use('/jobs', jobsRoutes);

app.get('/', (_req, res) => {
  res.json({ name: 'Job Queue System API', version: '1.0.0', status: 'running' });
});

app.use(notFound);
app.use(errorHandler);

const bootstrap = async (): Promise<void> => {
  try {
    await connectRedis();
    await connectDB();
    httpServer.listen(config.app.port, () => {
      logger.info(`🚀 Server running on http://localhost:${config.app.port}`);
      logger.info(`📋 Health check: http://localhost:${config.app.port}/health`);
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
