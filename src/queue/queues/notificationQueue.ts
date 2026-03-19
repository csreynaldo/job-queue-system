import { Queue } from 'bullmq';
import { redisConnection, defaultJobOptions } from './index';

export const notificationQueue = new Queue('notification', {
  connection: redisConnection,
  defaultJobOptions,
});

notificationQueue.on('error', (err) => {
  console.error('❌ Notification queue error:', err.message);
});
