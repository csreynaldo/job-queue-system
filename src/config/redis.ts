import IORedis from 'ioredis';
import { config } from './index';
import { logger } from './logger';

// BullMQ's type definitions depend on its own nested `ioredis` version.
// The runtime value is compatible, so we cast here to avoid a compile-time mismatch.
export const redisConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null, // ✅ Required by BullMQ
  enableReadyCheck: false, // ✅ Required by BullMQ
  retryStrategy: (times) => Math.min(times * 50, 2000),
}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

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
