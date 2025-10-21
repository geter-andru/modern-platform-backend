import * as Sentry from '@sentry/node';

/**
 * Check if Sentry is initialized
 */
const isSentryInitialized = () => {
  return Sentry.getCurrentHub && Sentry.getCurrentHub().getClient() !== undefined;
};

/**
 * No-op middleware for when Sentry is not initialized
 */
const noOpMiddleware = (req, res, next) => next();

/**
 * Sentry request handler middleware
 * Must be the first middleware to capture all requests
 */
export const sentryRequestHandler = () => {
  if (!isSentryInitialized()) {
    return noOpMiddleware;
  }
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
  if (!isSentryInitialized()) {
    return noOpMiddleware;
  }
  return Sentry.Handlers.tracingHandler();
};

/**
 * Sentry error handler middleware
 * Must be added AFTER all routes but BEFORE other error handlers
 */
export const sentryErrorHandler = () => {
  if (!isSentryInitialized()) {
    return noOpMiddleware;
  }
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
  if (!isSentryInitialized()) {
    return;
  }
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Set user context for Sentry
 */
export function setUserContext(user) {
  if (!isSentryInitialized()) {
    return;
  }
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
  if (!isSentryInitialized()) {
    return;
  }
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(category, message, data = {}) {
  if (!isSentryInitialized()) {
    return;
  }
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
