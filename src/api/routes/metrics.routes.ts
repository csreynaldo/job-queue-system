import { Router } from 'express';
import type { Request, Response } from 'express';
import { register } from '../../monitoring/metrics';
import { emailQueue } from '../../queue/queues/emailQueue';
import { reportQueue } from '../../queue/queues/reportQueue';
import { notificationQueue } from '../../queue/queues/notificationQueue';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  // Update queue depth gauges before responding
  const { queueDepthGauge } = await import('../../monitoring/metrics');

  const [emailWaiting, reportWaiting, notifWaiting] = await Promise.all([
    emailQueue.getWaitingCount(),
    reportQueue.getWaitingCount(),
    notificationQueue.getWaitingCount(),
  ]);

  queueDepthGauge.labels('email').set(emailWaiting);
  queueDepthGauge.labels('report').set(reportWaiting);
  queueDepthGauge.labels('notification').set(notifWaiting);

  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

export default router;
