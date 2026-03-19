import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import path from 'path';
import notificationProcessor from '../processors/notificationProcessor';
import { logger } from '../../config/logger';
import { config } from '../../config';
import { updateJobStatus, getJobByBullId } from '../../db/jobRepository';
import { emitJobStatus } from '../events/jobEvents';
import {
  jobsCompletedTotal,
  jobsFailedTotal,
  jobsActiveGauge,
  jobDurationHistogram,
} from '../../monitoring/metrics';

export const createNotificationWorker = (): Worker => {
  const processorFile = path.join(__dirname, `../processors/notificationProcessor${path.extname(__filename)}`);
  
  // Use direct function in Dev to bypass Windows+TSX process loader limitations
  const processor = config.app.isDev ? notificationProcessor : processorFile;

  const worker = new Worker('notification', processor, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  });

  worker.on('active', async (job) => {
    logger.info(`⚡ Notification job ${job.id} started`);
    jobsActiveGauge.labels('notification').inc();
    const record = await updateJobStatus(`notification-${job.id!}`, 'active', { started_at: new Date() });
    if (record) emitJobStatus(record.id, job.id!, 'notification', 'active');
  });

  worker.on('completed', async (job) => {
    logger.info(`✅ Notification job ${job.id} completed`);
    jobsActiveGauge.labels('notification').dec();
    jobsCompletedTotal.labels('notification').inc();
    jobDurationHistogram.labels('notification').observe(Date.now() - job.timestamp);
    const record = await updateJobStatus(`notification-${job.id!}`, 'completed', {
      result: job.returnvalue,
      completed_at: new Date(),
      duration_ms: Date.now() - job.timestamp,
    });
    if (record) emitJobStatus(record.id, job.id!, 'notification', 'completed');
  });

  worker.on('failed', async (job, err) => {
    logger.error(`❌ Notification job ${job?.id} failed`, { error: err.message });
    jobsActiveGauge.labels('notification').dec();
    jobsFailedTotal.labels('notification').inc();
    const record = await updateJobStatus(`notification-${job?.id!}`, 'failed', {
      error: err.message,
      attempts: job?.attemptsMade,
    });
    if (record) emitJobStatus(record.id, job?.id!, 'notification', 'failed', { error: err.message });
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`⚠️  Notification job ${jobId} stalled`);
  });

  return worker;
};
