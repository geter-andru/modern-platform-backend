import express from 'express';
import * as Sentry from '@sentry/node';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Test route to verify Sentry error tracking
 * GET /test/sentry-error
 */
router.get('/sentry-error', (req, res) => {
  logger.info('Testing Sentry error capture');

  // Trigger an intentional error for testing
  throw new Error('This is a test error to verify Sentry integration!');
});

/**
 * Test route to verify Sentry performance monitoring
 * GET /test/sentry-performance
 */
router.get('/sentry-performance', async (req, res) => {
  const transaction = Sentry.startTransaction({
    op: 'test',
    name: 'Test Performance Monitoring',
  });

  Sentry.getCurrentScope().setSpan(transaction);

  try {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));

    const span = transaction.startChild({
      op: 'db.query',
      description: 'Simulated database query',
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    span.finish();

    transaction.finish();

    res.json({
      success: true,
      message: 'Performance monitoring test complete. Check Sentry dashboard.',
    });
  } catch (error) {
    transaction.finish();
    throw error;
  }
});

/**
 * Test route to verify Sentry is configured
 * GET /test/sentry-status
 */
router.get('/sentry-status', (req, res) => {
  const sentryDsn = process.env.SENTRY_DSN;

  res.json({
    success: true,
    sentry: {
      configured: !!sentryDsn,
      dsn: sentryDsn ? `${sentryDsn.substring(0, 30)}...` : 'Not configured',
      environment: process.env.NODE_ENV,
    },
    message: sentryDsn
      ? 'Sentry is configured. Visit /test/sentry-error to test error capture.'
      : 'Sentry DSN not configured. Set SENTRY_DSN environment variable.',
  });
});

export default router;
