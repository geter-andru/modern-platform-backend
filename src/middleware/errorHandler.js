import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`Error in ${req.method} ${req.originalUrl}:`, err);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Validation errors (Joi)
  if (err.isJoi) {
    statusCode = 400;
    message = 'Validation Error';
    const details = err.details.map(detail => detail.message);
    return res.status(statusCode).json({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // Airtable API errors
  if (err.error && err.error.type === 'INVALID_REQUEST_UNKNOWN') {
    statusCode = 400;
    message = 'Invalid request to Airtable';
  }

  if (err.error && err.error.type === 'AUTHENTICATION_REQUIRED') {
    statusCode = 401;
    message = 'Airtable authentication failed';
  }

  if (err.error && err.error.type === 'NOT_FOUND') {
    statusCode = 404;
    message = 'Resource not found';
  }

  if (err.error && err.error.type === 'REQUEST_TOO_LARGE') {
    statusCode = 413;
    message = 'Request payload too large';
  }

  if (err.error && err.error.type === 'INVALID_REQUEST_MISSING_FIELDS') {
    statusCode = 422;
    message = 'Missing required fields';
  }

  if (err.error && err.error.type === 'INVALID_REQUEST_INVALID_FIELDS') {
    statusCode = 422;
    message = 'Invalid field values';
  }

  // Rate limiting errors
  if (err.type === 'rate_limit_exceeded') {
    statusCode = 429;
    message = 'Too many requests';
  }

  // Custom application errors
  if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Network errors
  if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  }

  if (err.code === 'ENOTFOUND') {
    statusCode = 502;
    message = 'External service unavailable';
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    support: 'Contact support@yourapp.com if this issue persists'
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  // Include request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  res.status(statusCode).json(errorResponse);
};

export default errorHandler;