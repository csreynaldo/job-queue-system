import { Queue } from 'bullmq';
import { redisConnection, defaultJobOptions } from './index';

export const reportQueue = new Queue('report', {
  connection: redisConnection,
  defaultJobOptions,
});

reportQueue.on('error', (err) => {
  console.error('❌ Report queue error:', err.message);
});
