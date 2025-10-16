import progressService from '../services/progressService.js';
import airtableService from '../services/airtableService.js';
import logger from '../utils/logger.js';

const progressController = {
  /**
   * Get customer progress dashboard
   */
  async getProgress(req, res) {
    try {
      const { customerId } = req.params;

      logger.info(`Getting progress for customer ${customerId}`);

      // Get current progress
      const currentProgress = await progressService.getCurrentProgress(customerId);
      
      // Generate insights
      const insights = await progressService.generateProgressInsights(customerId);

      res.status(200).json({
        success: true,
        data: {
          customerId,
          progress: currentProgress,
          insights: insights.success ? insights.insights : null,
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`Error getting progress for customer ${req.params.customerId}: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get progress data',
        details: error.message
      });
    }
  },

  /**
   * Track a specific action/event
   */
  async trackAction(req, res) {
    try {
      const { customerId } = req.params;
      const { action, metadata } = req.body;

      if (!action) {
        return res.status(400).json({
          success: false,
          error: 'Action is required'
        });
      }

      logger.info(`Tracking action '${action}' for customer ${customerId}`);

      // Track the progress
      const result = await progressService.trackProgress(customerId, action, metadata);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to track progress',
          details: result.error
        });
      }

      res.status(200).json({
        success: true,
        data: {
          customerId,
          action,
          progress: result.currentProgress,
          milestonesTriggered: result.milestonesTriggered,
          automationTriggered: result.automationTriggered,
          trackedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`Error tracking action for customer ${req.params.customerId}: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to track action',
        details: error.message
      });
    }
  },

  /**
   * Get detailed milestone information
   */
  async getMilestones(req, res) {
    try {
      const { customerId } = req.params;

      logger.info(`Getting milestones for customer ${customerId}`);

      const progress = await progressService.getCurrentProgress(customerId);

      res.status(200).json({
        success: true,
        data: {
          customerId,
          milestones: progress.milestones,
          summary: {
            total: progress.totalMilestones,
            completed: progress.completedMilestones,
            completionPercentage: progress.completionPercentage
          },
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`Error getting milestones for customer ${req.params.customerId}: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get milestone data',
        details: error.message
      });
    }
  },

  /**
   * Get progress insights and recommendations
   */
  async getInsights(req, res) {
    try {
      const { customerId } = req.params;

      logger.info(`Generating insights for customer ${customerId}`);

      const insights = await progressService.generateProgressInsights(customerId);

      if (!insights.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate insights',
          details: insights.error
        });
      }

      res.status(200).json({
        success: true,
        data: {
          customerId,
          insights: insights.insights,
          generatedAt: insights.generatedAt
        }
      });

    } catch (error) {
      logger.error(`Error generating insights for customer ${req.params.customerId}: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to generate insights',
        details: error.message
      });
    }
  },

  /**
   * Mark a milestone as completed manually
   */
  async completeMilestone(req, res) {
    try {
      const { customerId, milestoneId } = req.params;
      const { metadata } = req.body;

      logger.info(`Manually completing milestone ${milestoneId} for customer ${customerId}`);

      // Track as milestone completion
      const result = await progressService.trackProgress(
        customerId, 
        `milestone_${milestoneId}_completed`, 
        { manual: true, ...metadata }
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to complete milestone',
          details: result.error
        });
      }

      res.status(200).json({
        success: true,
        data: {
          customerId,
          milestoneId,
          progress: result.currentProgress,
          completedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`Error completing milestone for customer ${req.params.customerId}: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to complete milestone',
        details: error.message
      });
    }
  },

  /**
   * Get progress analytics for multiple customers (admin)
   */
  async getProgressAnalytics(req, res) {
    try {
      const { limit = 50 } = req.query;

      logger.info('Getting progress analytics for all customers');

      // Get all customers
      const customers = await airtableService.getAllCustomers(limit);
      
      // Get progress for each customer
      const analytics = [];
      for (const customer of customers.slice(0, 10)) { // Limit to 10 for performance
        try {
          const progress = await progressService.getCurrentProgress(customer.customerId);
          const insights = await progressService.generateProgressInsights(customer.customerId);
          
          analytics.push({
            customerId: customer.customerId,
            customerName: customer.customerName,
            company: customer.company,
            progress: progress.completionPercentage,
            stage: insights.success ? insights.insights.stage : 'Unknown',
            engagementScore: insights.success ? insights.insights.engagementScore : 0,
            lastAccessed: customer.lastAccessed
          });
        } catch (customerError) {
          logger.warn(`Failed to get progress for customer ${customer.customerId}: ${customerError.message}`);
        }
      }

      // Calculate summary statistics
      const summary = {
        totalCustomers: analytics.length,
        averageProgress: Math.round(analytics.reduce((sum, c) => sum + c.progress, 0) / analytics.length),
        averageEngagement: Math.round(analytics.reduce((sum, c) => sum + c.engagementScore, 0) / analytics.length),
        stageDistribution: analytics.reduce((dist, c) => {
          dist[c.stage] = (dist[c.stage] || 0) + 1;
          return dist;
        }, {}),
        highPerformers: analytics.filter(c => c.progress >= 70).length,
        atRisk: analytics.filter(c => c.engagementScore < 30).length
      };

      res.status(200).json({
        success: true,
        data: {
          summary,
          customers: analytics,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`Error getting progress analytics: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get progress analytics',
        details: error.message
      });
    }
  }
};

export default progressController;