import * as Sentry from '@sentry/node';

/**
 * Sentry request handler middleware
 * Must be the first middleware to capture all requests
 */
export const sentryRequestHandler = () => {
  return Sentry.Handlers.requestHandler({
    user: ['id', 'email', 'customerId'],
    ip: true,
    request: true,
  });
};

/**
 * Sentry tracing middleware
 * Enables performance monitoring for requests
 */
export const sentryTracingHandler = () => {
  return Sentry.Handlers.tracingHandler();
};

/**
 * Sentry error handler middleware
 * Must be added AFTER all routes but BEFORE other error handlers
 */
export const sentryErrorHandler = () => {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status >= 500
      if (error.status >= 500) {
        return true;
      }
      // Also capture specific error types
      if (error.name === 'UnauthorizedError' || error.name === 'ForbiddenError') {
        return true;
      }
      return false;
    },
  });
};

/**
 * Manually capture an exception with context
 */
export function captureException(error, context = {}) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Set user context for Sentry
 */
export function setUserContext(user) {
  Sentry.setUser({
    id: user.id || user.customerId,
    email: user.email,
    username: user.username || user.name,
    customerId: user.customerId,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(category, message, data = {}) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

export default {
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureException,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
};
