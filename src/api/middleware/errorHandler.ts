import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

export class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: 'error', message: err.message });
    return;
  }
  logger.error('Unhandled error:', { error: err.message });
  res.status(500).json({ status: 'error', message: 'Internal server error' });
};
