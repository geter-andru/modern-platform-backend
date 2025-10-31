/**
 * Redis Configuration Module
 *
 * Provides Redis connection configuration for BullMQ job queue.
 * Supports both in-memory queue (development/no Redis) and Redis connection (production).
 *
 * @module config/redis
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * Redis connection configuration
 *
 * If REDIS_URL is not configured, BullMQ will use an in-memory implementation.
 * This is suitable for development and testing without requiring Redis installation.
 *
 * For production, set REDIS_URL to enable persistent job storage and multi-worker support.
 */
const redisConfig = {
  // Redis connection URL (optional)
  // Format: redis://[username:password@]host:port[/database]
  // Example: redis://localhost:6379
  url: process.env.REDIS_URL || null,

  // Redis host (optional, alternative to url)
  host: process.env.REDIS_HOST || '127.0.0.1',

  // Redis port (optional, alternative to url)
  port: parseInt(process.env.REDIS_PORT || '6379', 10),

  // Redis password (optional)
  password: process.env.REDIS_PASSWORD || undefined,

  // Redis database number (0-15)
  db: parseInt(process.env.REDIS_DB || '0', 10),

  // Connection retry strategy
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,

  // Connection timeout (5 seconds)
  connectTimeout: 5000,

  // Keep-alive for long-running connections
  keepAlive: 30000,

  // Reconnection settings
  retryStrategy: (times) => {
    // Exponential backoff: 100ms, 200ms, 400ms, 800ms, max 3000ms
    const delay = Math.min(times * 100, 3000);
    console.log(`[Redis] Retry connection attempt ${times}, delay: ${delay}ms`);
    return delay;
  },

  // Enable offline queue (buffer commands when disconnected)
  enableOfflineQueue: true,

  // TLS configuration (for production Redis services)
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

/**
 * Check if Redis is configured and available
 * @returns {boolean} True if REDIS_URL is set, false for in-memory mode
 */
export const isRedisConfigured = () => {
  return !!process.env.REDIS_URL;
};

/**
 * Get connection configuration for BullMQ
 *
 * Returns Redis connection config if REDIS_URL is set,
 * otherwise returns null to trigger BullMQ's in-memory mode.
 *
 * @returns {Object|null} Redis connection config or null for in-memory
 */
export const getConnectionConfig = () => {
  if (!isRedisConfigured()) {
    console.log('[Queue] Running in IN-MEMORY mode (no Redis configured)');
    console.log('[Queue] Set REDIS_URL environment variable to enable persistent Redis queue');
    return null; // BullMQ will use in-memory implementation
  }

  console.log('[Queue] Redis configured:', redisConfig.url ? 'via URL' : `${redisConfig.host}:${redisConfig.port}`);

  // If url is provided, use it directly
  if (redisConfig.url) {
    return {
      url: redisConfig.url,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      enableReadyCheck: redisConfig.enableReadyCheck,
      retryStrategy: redisConfig.retryStrategy,
      tls: redisConfig.tls,
    };
  }

  // Otherwise, use host/port/password configuration
  return {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
    enableReadyCheck: redisConfig.enableReadyCheck,
    connectTimeout: redisConfig.connectTimeout,
    keepAlive: redisConfig.keepAlive,
    retryStrategy: redisConfig.retryStrategy,
    enableOfflineQueue: redisConfig.enableOfflineQueue,
    tls: redisConfig.tls,
  };
};

/**
 * Get queue connection options for BullMQ
 *
 * @returns {Object} BullMQ connection options
 */
export const getQueueConnectionOptions = () => {
  const connection = getConnectionConfig();

  // If no Redis, return empty object (BullMQ will use in-memory)
  if (!connection) {
    return {};
  }

  return { connection };
};

export default {
  isRedisConfigured,
  getConnectionConfig,
  getQueueConnectionOptions,
};
