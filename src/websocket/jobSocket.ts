import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { logger } from '../config/logger';
import type { JobEvent } from '../types/job.types';
import { config } from '../config';

let io: SocketIOServer;

export const initSocketServer = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.app.frontendUrl,
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const apiKey = socket.handshake.auth?.apiKey || socket.handshake.query?.apiKey;
    if (apiKey === config.app.apiKey) {
      next();
    } else {
      logger.warn(`🚫 Unauthorized socket connection attempt`, { ip: socket.handshake.address });
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`🔌 Client disconnected: ${socket.id}`);
    });

    // Allow client to subscribe to a specific job
    socket.on('subscribe:job', (jobId: string) => {
      socket.join(`job:${jobId}`);
      logger.info(`📡 Client ${socket.id} subscribed to job ${jobId}`);
    });

    // Allow client to unsubscribe
    socket.on('unsubscribe:job', (jobId: string) => {
      socket.leave(`job:${jobId}`);
    });
  });

  logger.info('🔌 WebSocket server initialized');
  return io;
};

// Emit job event to all subscribers
export const emitJobEvent = (event: JobEvent): void => {
  if (!io) return;

  // Emit to everyone watching this specific job
  io.to(`job:${event.jobId}`).emit('job:update', event);

  // Also emit to global feed for the dashboard
  io.emit('job:feed', event);
};

export const getIO = (): SocketIOServer => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};