import { Queue } from 'bullmq';
import { redisConnection, defaultJobOptions } from './index';

export const emailQueue = new Queue('email', {
  connection: redisConnection,
  defaultJobOptions,
});

emailQueue.on('error', (err) => {
  console.error('❌ Email queue error:', err.message);
});
