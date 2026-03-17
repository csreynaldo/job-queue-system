import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from '../config';
import { logger } from '../config/logger';
import { connectRedis } from '../config/redis';
import { connectDB } from '../db/database';
import { errorHandler, notFound } from './middleware/errorhandler';
import healthRoutes from './routes/health.routes';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'Job Queue System API',
    version: '1.0.0',
    status: 'running',
  });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Bootstrap
const bootstrap = async (): Promise<void> => {
  try {
    await connectRedis();
    await connectDB();

    httpServer.listen(config.app.port, () => {
      logger.info(`🚀 Server running on http://localhost:${config.app.port}`);
      logger.info(`📋 Health check: http://localhost:${config.app.port}/health`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', { error: (err as Error).message });
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  httpServer.close(() => process.exit(0));
});

bootstrap();

export { app, httpServer };