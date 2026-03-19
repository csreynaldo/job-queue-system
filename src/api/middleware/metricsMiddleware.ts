import type { Request, Response, NextFunction } from 'express';
import { httpRequestDuration } from '../../monitoring/metrics';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path ?? req.path;

    httpRequestDuration.labels(req.method, route, String(res.statusCode)).observe(duration);
  });

  next();
};
