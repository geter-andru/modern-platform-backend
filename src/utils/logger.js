import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, printf, colorize, errors, json, metadata } = winston.format;

/**
 * PRODUCTION-GRADE STRUCTURED LOGGER
 *
 * Features:
 * - JSON structured logging for machine parsing
 * - Human-readable format for development
 * - Metadata enrichment (service, environment, pid)
 * - Child logger support for request context
 * - Sentry integration ready (added in CHUNK 4)
 * - Environment-specific configuration
 *
 * Usage:
 *   logger.info('user_login', { userId: '123', ip: '1.2.3.4' });
 *   logger.error('database_error', { error: err, query: 'SELECT...' });
 *   const reqLogger = logger.child({ requestId: 'abc123' });
 */

// Base metadata added to all logs
const baseMetadata = {
  service: 'hs-platform-api',
  environment: config.server.nodeEnv || 'development',
  pid: process.pid,
  hostname: process.env.HOSTNAME || 'localhost',
};

// Human-readable format for console (development)
const humanReadableFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  // Extract metadata without base fields
  const { service, environment, pid, hostname, ...customMeta } = meta;

  let logLine = `${timestamp} [${level}]: ${stack || message}`;

  // Add custom metadata if present
  if (Object.keys(customMeta).length > 0) {
    logLine += ` ${JSON.stringify(customMeta)}`;
  }

  return logLine;
});

// JSON format for files and production (machine-readable)
const jsonFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  json()
);

// Create base logger instance
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  defaultMeta: baseMetadata,
  format: jsonFormat, // Default to JSON for files
  transports: [
    // File transport for all logs (JSON format)
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: jsonFormat,
    }),

    // File transport for errors only (JSON format)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: jsonFormat,
    }),
  ],
});

// Add console transport with environment-specific formatting
if (config.server.nodeEnv !== 'test') {
  logger.add(new winston.transports.Console({
    format: config.server.nodeEnv === 'production'
      ? jsonFormat // JSON in production for log aggregation
      : combine(
          colorize(),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          humanReadableFormat
        ),
  }));
}

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: 'logs/exceptions.log',
    format: jsonFormat,
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: 'logs/rejections.log',
    format: jsonFormat,
  })
);

/**
 * Create a child logger with additional context
 *
 * @param {Object} context - Additional metadata to include in all logs
 * @returns {winston.Logger} Child logger instance
 *
 * @example
 * const reqLogger = logger.child({ requestId: 'abc123', userId: '456' });
 * reqLogger.info('request_started', { method: 'GET', path: '/api/users' });
 */
logger.createChild = function(context) {
  return this.child(context);
};

/**
 * Log levels (highest to lowest priority):
 * - error: Error events that might still allow the application to continue
 * - warn: Warning events that might lead to errors
 * - info: Informational messages about application progress
 * - http: HTTP request/response logging
 * - verbose: More detailed informational messages
 * - debug: Debug messages for development
 * - silly: Very detailed debug messages
 */

export default logger;