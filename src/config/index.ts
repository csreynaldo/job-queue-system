import dotenv from 'dotenv';

dotenv.config();

const requireEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config = {
  app: {
    env: requireEnv('NODE_ENV', 'development'),
    port: parseInt(requireEnv('PORT', '3000'), 10),
    isDev: (process.env.NODE_ENV ?? 'development') === 'development',
    apiKey: requireEnv('API_KEY', 'default-dev-key'),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  redis: {
    host: requireEnv('REDIS_HOST', 'localhost'),
    port: parseInt(requireEnv('REDIS_PORT', '6379'), 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  db: {
    host: requireEnv('DB_HOST', 'localhost'),
    port: parseInt(requireEnv('DB_PORT', '5432'), 10),
    name: requireEnv('DB_NAME', 'jobqueue'),
    user: requireEnv('DB_USER', 'postgres'),
    password: (process.env.NODE_ENV === 'production' && !process.env.DB_PASSWORD)
      ? (() => { throw new Error('DB_PASSWORD must be strictly defined in production'); })()
      : process.env.DB_PASSWORD ?? '',
  },
  worker: {
    concurrency: parseInt(requireEnv('WORKER_CONCURRENCY', '5'), 10),
    maxRetryAttempts: parseInt(requireEnv('MAX_RETRY_ATTEMPTS', '3'), 10),
    retryDelayMs: parseInt(requireEnv('RETRY_DELAY_MS', '1000'), 10),
  },
} as const;