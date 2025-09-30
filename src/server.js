import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import 'express-async-errors';

import config from './config/index.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { 
  rateLimiter, 
  corsOptions, 
  helmetConfig, 
  requestLogger, 
  sanitizeInput 
} from './middleware/security.js';

// Create Express application
const app = express();

// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet(helmetConfig));
app.use(cors(corsOptions));
app.use(rateLimiter);
app.use(sanitizeInput);

// Request parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.server.nodeEnv === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Add request ID for tracking
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Routes
app.use('/', routes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server only if not in test environment
let server;
if (config.server.nodeEnv !== 'test') {
  server = app.listen(config.server.port, () => {
    logger.info(`🚀 H&S Platform API Server running on port ${config.server.port}`);
    logger.info(`📍 Environment: ${config.server.nodeEnv}`);
    logger.info(`🔗 API Base URL: ${config.server.apiBaseUrl}`);
    logger.info(`📚 API Documentation: ${config.server.apiBaseUrl}/api/docs`);
    logger.info(`❤️  Health Check: ${config.server.apiBaseUrl}/health`);
  });
}

export default app;