import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import config from '../config/index.js';

/**
 * Initialize Sentry for backend error tracking and performance monitoring
 */
export function initializeSentry() {
  // Skip Sentry in test environment
  if (config.server.nodeEnv === 'test') {
    console.log('Sentry disabled in test environment');
    return;
  }

  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('⚠️  SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,

    // Environment tracking
    environment: config.server.nodeEnv || 'development',

    // Performance Monitoring
    tracesSampleRate: config.server.nodeEnv === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: config.server.nodeEnv === 'production' ? 0.1 : 1.0,

    integrations: [
      // Node profiling
      nodeProfilingIntegration(),

      // HTTP tracing
      new Sentry.Integrations.Http({ tracing: true }),

      // Express integration (will be added via middleware)
    ],

    // Release tracking
    release: process.env.SENTRY_RELEASE || `backend@${process.env.npm_package_version || 'dev'}`,

    // Don't send errors in development
    beforeSend(event, hint) {
      if (config.server.nodeEnv === 'development') {
        console.log('🔍 Sentry would send:', event.exception || event.message);
        return null; // Don't actually send in dev
      }
      return event;
    },

    // Filter out sensitive data
    beforeBreadcrumb(breadcrumb) {
      // Redact Authorization headers
      if (breadcrumb.category === 'http' && breadcrumb.data?.headers) {
        if (breadcrumb.data.headers.authorization) {
          breadcrumb.data.headers.authorization = '[Filtered]';
        }
        if (breadcrumb.data.headers['x-api-key']) {
          breadcrumb.data.headers['x-api-key'] = '[Filtered]';
        }
      }
      return breadcrumb;
    },
  });

  console.log(`✅ Sentry initialized (environment: ${config.server.nodeEnv})`);
}

export default Sentry;
