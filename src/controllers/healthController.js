import airtableService from '../services/airtableService.js';
import logger from '../utils/logger.js';

const healthController = {
  // Basic health check
  async checkHealth(req, res) {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };

      res.status(200).json({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        timestamp: new Date().toISOString()
      });
    }
  },

  // Detailed health check including external dependencies
  async checkHealthDetailed(req, res) {
    try {
      const startTime = Date.now();
      
      // Check Airtable connectivity
      let airtableStatus = 'unknown';
      let airtableResponseTime = null;
      
      try {
        const airtableStart = Date.now();
        await airtableService.testConnection();
        airtableResponseTime = Date.now() - airtableStart;
        airtableStatus = 'healthy';
      } catch (error) {
        airtableStatus = 'unhealthy';
        logger.error('Airtable health check failed:', error);
      }

      const totalResponseTime = Date.now() - startTime;

      const healthStatus = {
        status: airtableStatus === 'healthy' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        dependencies: {
          airtable: {
            status: airtableStatus,
            responseTime: airtableResponseTime,
          }
        },
        responseTime: totalResponseTime
      };

      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: healthStatus.status === 'healthy',
        data: healthStatus
      });
    } catch (error) {
      logger.error('Detailed health check failed:', error);
      res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        timestamp: new Date().toISOString()
      });
    }
  }
};

export default healthController;