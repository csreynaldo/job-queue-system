import { Router } from 'express';
import type { Request, Response } from 'express';
import { redisConnection } from '../../config/redis';
import { db } from '../../db/database';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const checks = {
    api: 'ok',
    redis: 'unknown',
    postgres: 'unknown',
  };

  try {
    await redisConnection.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  try {
    await db.query('SELECT 1');
    checks.postgres = 'ok';
  } catch {
    checks.postgres = 'error';
  }

  const allHealthy = Object.values(checks).every((v) => v === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;