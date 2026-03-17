import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
};