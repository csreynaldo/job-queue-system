import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { emailProcessor } from '../processors/emailProcessor';
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

export const createEmailWorker = (): Worker => {
  const worker = new Worker('email', emailProcessor, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  });

  worker.on('active', async (job) => {
    logger.info(`⚡ Email job ${job.id} started`);
    jobsActiveGauge.labels('email').inc();
    await updateJobStatus(`email-${job.id!}`, 'active', { started_at: new Date() });
    const record = await getJobByBullId(`email-${job.id!}`);
    if (record) emitJobStatus(record.id, job.id!, 'email', 'active');
  });

  worker.on('completed', async (job) => {
    logger.info(`✅ Email job ${job.id} completed`);
    jobsActiveGauge.labels('email').dec();
    jobsCompletedTotal.labels('email').inc();
    jobDurationHistogram.labels('email').observe(Date.now() - job.timestamp);
    await updateJobStatus(`email-${job.id!}`, 'completed', {
      result: job.returnvalue,
      completed_at: new Date(),
      duration_ms: Date.now() - job.timestamp,
    });
    const record = await getJobByBullId(`email-${job.id!}`);
    if (record) emitJobStatus(record.id, job.id!, 'email', 'completed');
  });

  worker.on('failed', async (job, err) => {
    logger.error(`❌ Email job ${job?.id} failed`, { error: err.message });
    jobsActiveGauge.labels('email').dec();
    jobsFailedTotal.labels('email').inc();
    await updateJobStatus(`email-${job?.id!}`, 'failed', {
      error: err.message,
      attempts: job?.attemptsMade,
    });
    const record = await getJobByBullId(`email-${job?.id!}`);
    if (record) emitJobStatus(record.id, job?.id!, 'email', 'failed', { error: err.message });
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`⚠️  Email job ${jobId} stalled`);
  });

  return worker;
};
