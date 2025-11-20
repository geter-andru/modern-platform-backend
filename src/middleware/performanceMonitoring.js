/**
 * Performance Monitoring Middleware
 *
 * Tracks request performance metrics for AI calls and critical endpoints.
 * Provides visibility into:
 * - Response times for AI generation
 * - Success/failure rates
 * - Slow endpoint detection
 * - Resource usage patterns
 *
 * Created: 2025-11-01 (Phase 0.4)
 * Part of: Staged Launch Strategy - Free Beta preparation
 */

import logger from '../utils/logger.js';

/**
 * Performance metrics store (in-memory for beta)
 * In production, this would be replaced with a time-series database like Prometheus/InfluxDB
 */
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      requests: [],
      aiCalls: [],
      errors: []
    };
    this.maxStoredMetrics = 1000; // Keep last 1000 entries of each type
  }

  /**
   * Record a request metric
   */
  recordRequest(metric) {
    this.metrics.requests.push({
      ...metric,
      timestamp: new Date().toISOString()
    });

    // Trim to max size
    if (this.metrics.requests.length > this.maxStoredMetrics) {
      this.metrics.requests.shift();
    }
  }

  /**
   * Record an AI call metric
   */
  recordAICall(metric) {
    this.metrics.aiCalls.push({
      ...metric,
      timestamp: new Date().toISOString()
    });

    // Trim to max size
    if (this.metrics.aiCalls.length > this.maxStoredMetrics) {
      this.metrics.aiCalls.shift();
    }

    // Log if call was slow or failed
    if (metric.duration > 30000) {
      logger.warn('slow_ai_call', {
        operation: metric.operation,
        duration: metric.duration,
        success: metric.success
      });
    }

    if (!metric.success) {
      logger.error('ai_call_failed', {
        operation: metric.operation,
        error: metric.error,
        retryCount: metric.retryCount
      });
    }
  }

  /**
   * Record an error metric
   */
  recordError(metric) {
    this.metrics.errors.push({
      ...metric,
      timestamp: new Date().toISOString()
    });

    // Trim to max size
    if (this.metrics.errors.length > this.maxStoredMetrics) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Get aggregated metrics for the last N minutes
   */
  getAggregatedMetrics(minutes = 60) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    const recentRequests = this.metrics.requests.filter(
      m => new Date(m.timestamp) > cutoff
    );

    const recentAICalls = this.metrics.aiCalls.filter(
      m => new Date(m.timestamp) > cutoff
    );

    const recentErrors = this.metrics.errors.filter(
      m => new Date(m.timestamp) > cutoff
    );

    return {
      timeWindow: `${minutes} minutes`,
      requests: {
        total: recentRequests.length,
        avgDuration: this._calculateAverage(recentRequests.map(m => m.duration)),
        p95Duration: this._calculatePercentile(recentRequests.map(m => m.duration), 95),
        p99Duration: this._calculatePercentile(recentRequests.map(m => m.duration), 99)
      },
      aiCalls: {
        total: recentAICalls.length,
        successful: recentAICalls.filter(m => m.success).length,
        failed: recentAICalls.filter(m => !m.success).length,
        successRate: recentAICalls.length > 0
          ? ((recentAICalls.filter(m => m.success).length / recentAICalls.length) * 100).toFixed(2) + '%'
          : 'N/A',
        avgDuration: this._calculateAverage(recentAICalls.map(m => m.duration)),
        p95Duration: this._calculatePercentile(recentAICalls.map(m => m.duration), 95),
        p99Duration: this._calculatePercentile(recentAICalls.map(m => m.duration), 99),
        byOperation: this._groupByOperation(recentAICalls)
      },
      errors: {
        total: recentErrors.length,
        byType: this._groupByErrorType(recentErrors)
      }
    };
  }

  /**
   * Calculate average of an array of numbers
   */
  _calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return Math.round(sum / numbers.length);
  }

  /**
   * Calculate percentile of an array of numbers
   */
  _calculatePercentile(numbers, percentile) {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Group AI calls by operation type
   */
  _groupByOperation(aiCalls) {
    const grouped = {};
    aiCalls.forEach(call => {
      if (!grouped[call.operation]) {
        grouped[call.operation] = {
          total: 0,
          successful: 0,
          failed: 0,
          avgDuration: 0
        };
      }
      grouped[call.operation].total++;
      if (call.success) {
        grouped[call.operation].successful++;
      } else {
        grouped[call.operation].failed++;
      }
    });

    // Calculate averages
    Object.keys(grouped).forEach(operation => {
      const operationCalls = aiCalls.filter(c => c.operation === operation);
      grouped[operation].avgDuration = this._calculateAverage(operationCalls.map(c => c.duration));
    });

    return grouped;
  }

  /**
   * Group errors by type
   */
  _groupByErrorType(errors) {
    const grouped = {};
    errors.forEach(error => {
      const type = error.type || 'unknown';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }
}

// Create singleton instance
const performanceMetrics = new PerformanceMetrics();

/**
 * Express middleware to track request performance
 *
 * Usage:
 *   app.use(performanceMonitoring);
 */
export const performanceMonitoring = (req, res, next) => {
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override res.end to capture metrics
  res.end = function(...args) {
    const duration = Date.now() - startTime;

    // Record metric
    performanceMetrics.recordRequest({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      success: res.statusCode < 400
    });

    // Log slow requests (>5 seconds)
    if (duration > 5000) {
      logger.warn('slow_request', {
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode
      });
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Helper function to record AI call metrics from aiService
 *
 * Now saves to both in-memory metrics AND Supabase database for persistent tracking.
 *
 * Usage in aiService.js:
 *   import { recordAIMetric } from '../middleware/performanceMonitoring.js';
 *   const startTime = Date.now();
 *   try {
 *     const result = await this.callAnthropicAPI(...);
 *     recordAIMetric({
 *       operation: 'generateICP',
 *       duration: Date.now() - startTime,
 *       success: true,
 *       customerId: 'user-123',
 *       inputTokens: 800,
 *       outputTokens: 1800,
 *       estimatedCost: 0.147,
 *       model: 'claude-3-opus-20240229'
 *     });
 *   } catch (error) {
 *     recordAIMetric({
 *       operation: 'generateICP',
 *       duration: Date.now() - startTime,
 *       success: false,
 *       error: error.message,
 *       customerId: 'user-123'
 *     });
 *   }
 */
export const recordAIMetric = async (metric) => {
  // Record in-memory for immediate access
  performanceMetrics.recordAICall(metric);

  // Persist to database for long-term tracking (async, non-blocking)
  // Import dynamically to avoid circular dependencies
  try {
    const { default: aiCostTrackingService } = await import('../services/aiCostTrackingService.js');
    await aiCostTrackingService.recordMetric(metric);
  } catch (error) {
    logger.error('[PerformanceMonitoring] Failed to persist AI metric to database', {
      error: error.message,
      operation: metric.operation
    });
    // Don't throw - metric is already recorded in-memory
  }
};

/**
 * Helper function to record error metrics
 */
export const recordError = (error, context = {}) => {
  performanceMetrics.recordError({
    type: error.name || 'Error',
    message: error.message,
    stack: error.stack,
    ...context
  });
};

/**
 * Get current performance metrics
 *
 * Usage:
 *   const metrics = getPerformanceMetrics(60); // Last 60 minutes
 */
export const getPerformanceMetrics = (minutes = 60) => {
  return performanceMetrics.getAggregatedMetrics(minutes);
};

/**
 * Retry wrapper for async operations
 *
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.delayMs - Delay between retries in milliseconds (default: 1000)
 * @param {number} options.backoffMultiplier - Exponential backoff multiplier (default: 2)
 * @param {string} options.operationName - Name for logging purposes
 * @returns {Promise} Result of the operation
 *
 * @example
 * const result = await retryOperation(
 *   () => callAnthropicAPI(prompt),
 *   { maxRetries: 3, operationName: 'generateICP' }
 * );
 */
export const retryOperation = async (operation, options = {}) => {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    operationName = 'operation'
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      if (attempt > 0) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        logger.info('retry_attempt', {
          operation: operationName,
          attempt,
          maxRetries,
          delayMs: delay
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await operation();

      if (attempt > 0) {
        logger.info('retry_success', {
          operation: operationName,
          successfulAttempt: attempt + 1,
          totalAttempts: attempt + 1
        });
      }

      return result;
    } catch (error) {
      lastError = error;
      attempt++;

      logger.warn('retry_failed_attempt', {
        operation: operationName,
        attempt,
        maxRetries,
        error: error.message
      });

      // Don't retry on certain errors (e.g., validation errors)
      if (error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 403) {
        logger.error('retry_aborted_non_retryable', {
          operation: operationName,
          statusCode: error.statusCode,
          error: error.message
        });
        throw error;
      }

      // If we've exhausted retries, throw the error
      if (attempt > maxRetries) {
        logger.error('retry_exhausted', {
          operation: operationName,
          totalAttempts: attempt,
          error: error.message
        });
        throw error;
      }
    }
  }

  // This should never be reached, but just in case
  throw lastError;
};

/**
 * Express endpoint to expose metrics (for internal monitoring)
 * Add to routes/index.js:
 *   router.get('/api/metrics', getMetricsEndpoint);
 */
export const getMetricsEndpoint = (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes) || 60;
    const metrics = getPerformanceMetrics(minutes);

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('metrics_endpoint_error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics'
    });
  }
};

export default {
  performanceMonitoring,
  recordAIMetric,
  recordError,
  getPerformanceMetrics,
  retryOperation,
  getMetricsEndpoint
};
