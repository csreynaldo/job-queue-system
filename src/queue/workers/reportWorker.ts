import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { reportProcessor } from '../processors/reportProcessor';
import { logger } from '../../config/logger';
import { config } from '../../config';

export const createReportWorker = (): Worker => {
  const worker = new Worker('report', reportProcessor, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  });

  worker.on('completed', (job) => {
    logger.info(`✅ Report job ${job.id} completed`, {
      result: job.returnvalue,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ Report job ${job?.id} failed`, {
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('active', (job) => {
    logger.info(`⚡ Report job ${job.id} started`);
  });

  worker.on('progress', (job, progress) => {
    logger.info(`📊 Report job ${job.id} progress: ${progress}%`);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`⚠️  Report job ${jobId} stalled`);
  });

  return worker;
};