import IORedis from 'ioredis';
import { config } from './index';
import { logger } from './logger';

export const redisConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,   // ✅ Required by BullMQ
  enableReadyCheck: false,      // ✅ Required by BullMQ
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redisConnection.on('error', (err: Error) => {
  logger.error('❌ Redis client error:', { error: err.message });
});

redisConnection.on('connect', () => {
  logger.info('✅ Redis connected');
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisConnection.ping();
    logger.info('✅ Redis connection verified');
  } catch (err) {
    logger.error('❌ Failed to connect to Redis:', { error: (err as Error).message });
    throw err;
  }
};