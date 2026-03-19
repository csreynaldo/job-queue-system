import { Server as SocketIOServer } from 'socket.io';
import IORedis from 'ioredis';
import type { Server as HTTPServer } from 'http';
import { logger } from '../config/logger';
import type { JobEvent } from '../types/job.types';
import { config } from '../config';

let io: SocketIOServer;
const JOB_EVENTS_CHANNEL = 'job-events';

// Separate connection for pub/sub so we don't interfere with BullMQ command traffic.
const pubSubConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const emitToSockets = (event: JobEvent): void => {
  if (!io) return;

  // Emit to everyone watching this specific job
  io.to(`job:${event.jobId}`).emit('job:update', event);

  // Also emit to global feed for the dashboard
  io.emit('job:feed', event);
};

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

  // Forward job events published by other processes/containers.
  pubSubConnection
    .subscribe(JOB_EVENTS_CHANNEL)
    .then(() => logger.info(`📣 Subscribed to Redis channel: ${JOB_EVENTS_CHANNEL}`))
    .catch((err) =>
      logger.error('❌ Failed to subscribe to job-events channel', { error: err.message }),
    );

  pubSubConnection.on('message', (channel, message) => {
    if (channel !== JOB_EVENTS_CHANNEL) return;
    try {
      emitToSockets(JSON.parse(message) as JobEvent);
    } catch (err) {
      logger.error('❌ Failed to parse job event from Redis', { error: (err as Error).message });
    }
  });

  logger.info('🔌 WebSocket server initialized');
  return io;
};

export const emitJobEvent = (event: JobEvent): void => {
  // If we're not running the API process, publish to Redis so the API can forward it.
  if (!io) {
    pubSubConnection.publish(JOB_EVENTS_CHANNEL, JSON.stringify(event)).catch((err) => {
      logger.error('❌ Failed to publish job event to Redis', { error: err.message });
    });
    return;
  }

  emitToSockets(event);
};

export const getIO = (): SocketIOServer => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
