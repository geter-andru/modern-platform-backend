import airtableService from './airtableService.js';
import makeService from './makeService.js';
import logger from '../utils/logger.js';

class ProgressService {
  constructor() {
    this.milestones = [
      {
        id: 'initial_setup',
        name: 'Platform Setup',
        description: 'Customer account created and initial data collected',
        weight: 10,
        triggers: ['customer_created', 'profile_completed']
      },
      {
        id: 'icp_analysis',
        name: 'ICP Analysis Completed',
        description: 'Ideal Customer Profile analysis generated',
        weight: 25,
        triggers: ['icp_generated', 'icp_reviewed']
      },
      {
        id: 'cost_calculation',
        name: 'Cost Analysis Completed',
        description: 'Cost of inaction calculated with insights',
        weight: 25,
        triggers: ['cost_calculated', 'cost_reviewed']
      },
      {
        id: 'business_case',
        name: 'Business Case Generated',
        description: 'Comprehensive business case created',
        weight: 30,
        triggers: ['business_case_generated', 'business_case_reviewed']
      },
      {
        id: 'export_delivery',
        name: 'Results Delivered',
        description: 'Final deliverables exported and shared',
        weight: 10,
        triggers: ['content_exported', 'results_delivered']
      }
    ];
  }

  /**
   * Track customer progress and detect milestone completions
   */
  async trackProgress(customerId, action, metadata = {}) {
    try {
      logger.info(`Tracking progress for customer ${customerId}: ${action}`);

      // Get current customer data
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Get current progress
      const currentProgress = await this.getCurrentProgress(customerId);
      
      // Check for milestone triggers
      const triggeredMilestones = this.checkMilestones(action, currentProgress);
      
      // Update progress tracking
      const updatedProgress = await this.updateProgress(customerId, action, triggeredMilestones, metadata);
      
      // Trigger automation for completed milestones
      if (triggeredMilestones.length > 0) {
        await this.triggerMilestoneAutomation(customer, triggeredMilestones, updatedProgress);
      }

      return {
        success: true,
        currentProgress: updatedProgress,
        milestonesTriggered: triggeredMilestones,
        automationTriggered: triggeredMilestones.length > 0
      };

    } catch (error) {
      logger.error(`Error tracking progress for customer ${customerId}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current progress for a customer
   */
  async getCurrentProgress(customerId) {
    try {
      const progressData = await airtableService.getUserProgress(customerId);
      
      // Calculate overall completion percentage
      const completedMilestones = this.milestones.filter(milestone => 
        progressData.some(p => p.milestone === milestone.id && p.completed)
      );
      
      const totalWeight = this.milestones.reduce((sum, m) => sum + m.weight, 0);
      const completedWeight = completedMilestones.reduce((sum, m) => sum + m.weight, 0);
      const completionPercentage = Math.round((completedWeight / totalWeight) * 100);

      return {
        completionPercentage,
        completedMilestones: completedMilestones.length,
        totalMilestones: this.milestones.length,
        milestones: this.milestones.map(milestone => ({
          ...milestone,
          completed: completedMilestones.some(c => c.id === milestone.id),
          completedAt: progressData.find(p => p.milestone === milestone.id)?.completedAt
        })),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.warn(`Could not get progress for customer ${customerId}: ${error.message}`);
      return {
        completionPercentage: 0,
        completedMilestones: 0,
        totalMilestones: this.milestones.length,
        milestones: this.milestones.map(m => ({ ...m, completed: false }))
      };
    }
  }

  /**
   * Check if any milestones are triggered by the action
   */
  checkMilestones(action, currentProgress) {
    const triggeredMilestones = [];

    for (const milestone of this.milestones) {
      // Skip if already completed
      if (currentProgress.milestones?.find(m => m.id === milestone.id && m.completed)) {
        continue;
      }

      // Check if action triggers this milestone
      if (milestone.triggers.includes(action)) {
        triggeredMilestones.push(milestone);
      }

      // Special logic for automatic milestone detection
      if (this.shouldAutoTriggerMilestone(milestone, action, currentProgress)) {
        triggeredMilestones.push(milestone);
      }
    }

    return triggeredMilestones;
  }

  /**
   * Auto-trigger milestones based on intelligent detection
   */
  shouldAutoTriggerMilestone(milestone, action, currentProgress) {
    switch (milestone.id) {
      case 'icp_analysis':
        return action === 'icp_content_updated' || action === 'ai_icp_generated';
      
      case 'cost_calculation':
        return action === 'cost_calculated' || action === 'ai_cost_calculated';
      
      case 'business_case':
        return action === 'business_case_saved' || action === 'ai_business_case_generated';
      
      case 'export_delivery':
        return action === 'content_exported' && currentProgress.completedMilestones >= 2;
      
      default:
        return false;
    }
  }

  /**
   * Update progress tracking in database
   */
  async updateProgress(customerId, action, triggeredMilestones, metadata) {
    try {
      const timestamp = new Date().toISOString();

      // Update milestones
      for (const milestone of triggeredMilestones) {
        await airtableService.updateUserProgress(customerId, milestone.id, {
          completed: true,
          completedAt: timestamp,
          action: action,
          metadata: metadata
        });
      }

      // Log the action
      await airtableService.updateUserProgress(customerId, `action_${Date.now()}`, {
        action: action,
        timestamp: timestamp,
        metadata: metadata,
        milestonesTriggered: triggeredMilestones.map(m => m.id)
      });

      // Get updated progress
      return await this.getCurrentProgress(customerId);

    } catch (error) {
      logger.error(`Error updating progress: ${error.message}`);
      throw error;
    }
  }

  /**
   * Trigger automation for completed milestones
   */
  async triggerMilestoneAutomation(customer, triggeredMilestones, progressData) {
    try {
      for (const milestone of triggeredMilestones) {
        logger.info(`Milestone achieved: ${milestone.name} for customer ${customer.customerId}`);

        // Prepare progress update data
        const progressUpdate = {
          milestone: milestone.name,
          achievement: milestone.description,
          impact: `Customer progress: ${progressData.completionPercentage}%`,
          nextSteps: this.getNextSteps(milestone.id, progressData),
          completionPercentage: progressData.completionPercentage,
          completedMilestones: progressData.completedMilestones,
          totalMilestones: progressData.totalMilestones
        };

        // Trigger Make.com automation
        await makeService.triggerProgressUpdate(customer, progressUpdate);
      }

      // If significant progress milestone reached, trigger special automation
      if (progressData.completionPercentage >= 50) {
        const specialUpdate = {
          milestone: 'Halfway Point Reached',
          achievement: 'Customer has completed 50% of the revenue intelligence journey',
          impact: 'Strong engagement and progress towards revenue goals',
          nextSteps: ['Focus on business case refinement', 'Prepare for results delivery'],
          completionPercentage: progressData.completionPercentage
        };

        await makeService.triggerProgressUpdate(customer, specialUpdate);
      }

    } catch (error) {
      logger.error(`Error triggering milestone automation: ${error.message}`);
    }
  }

  /**
   * Get next steps based on completed milestone
   */
  getNextSteps(milestoneId, progressData) {
    const nextSteps = {
      'initial_setup': [
        'Begin ICP analysis',
        'Gather business context',
        'Review platform features'
      ],
      'icp_analysis': [
        'Proceed to cost calculation',
        'Review ICP insights',
        'Refine target segments'
      ],
      'cost_calculation': [
        'Generate business case',
        'Review cost implications',
        'Plan mitigation strategies'
      ],
      'business_case': [
        'Prepare for export',
        'Schedule review meeting',
        'Plan implementation'
      ],
      'export_delivery': [
        'Review final deliverables',
        'Plan next steps',
        'Schedule follow-up'
      ]
    };

    return nextSteps[milestoneId] || ['Continue platform engagement'];
  }

  /**
   * Generate intelligent insights about customer progress
   */
  async generateProgressInsights(customerId) {
    try {
      const progress = await this.getCurrentProgress(customerId);
      const customer = await airtableService.getCustomerById(customerId);

      const insights = {
        overallProgress: progress.completionPercentage,
        stage: this.determineCurrentStage(progress),
        recommendations: this.generateRecommendations(progress),
        nextMilestone: this.getNextMilestone(progress),
        estimatedCompletion: this.estimateCompletion(progress),
        engagementScore: this.calculateEngagementScore(progress, customer)
      };

      return {
        success: true,
        insights,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error generating progress insights: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determine current stage based on progress
   */
  determineCurrentStage(progress) {
    if (progress.completionPercentage < 20) return 'Getting Started';
    if (progress.completionPercentage < 50) return 'Analysis Phase';
    if (progress.completionPercentage < 80) return 'Business Case Development';
    if (progress.completionPercentage < 100) return 'Delivery Preparation';
    return 'Completed';
  }

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(progress) {
    const recommendations = [];
    
    if (progress.completionPercentage < 30) {
      recommendations.push('Focus on completing ICP analysis for better targeting');
    }
    
    if (progress.completionPercentage >= 30 && progress.completionPercentage < 60) {
      recommendations.push('Use cost calculator to quantify business impact');
    }
    
    if (progress.completionPercentage >= 60 && progress.completionPercentage < 90) {
      recommendations.push('Generate comprehensive business case for stakeholders');
    }
    
    if (progress.completionPercentage >= 90) {
      recommendations.push('Export results and schedule implementation planning');
    }

    return recommendations;
  }

  /**
   * Get next milestone to work on
   */
  getNextMilestone(progress) {
    const nextMilestone = progress.milestones?.find(m => !m.completed);
    return nextMilestone ? {
      name: nextMilestone.name,
      description: nextMilestone.description,
      weight: nextMilestone.weight
    } : null;
  }

  /**
   * Estimate completion time
   */
  estimateCompletion(progress) {
    const remainingWeight = 100 - progress.completionPercentage;
    const avgTimePerPercent = 2; // 2 days per percentage point (rough estimate)
    const estimatedDays = Math.ceil(remainingWeight * avgTimePerPercent);
    
    return {
      estimatedDays,
      estimatedDate: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }

  /**
   * Calculate engagement score
   */
  calculateEngagementScore(progress, customer) {
    let score = 0;
    
    // Base score from completion
    score += progress.completionPercentage * 0.6;
    
    // Bonus for recent activity
    const lastAccessed = new Date(customer.lastAccessed || 0);
    const daysSinceAccess = (Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAccess < 1) score += 20;
    else if (daysSinceAccess < 3) score += 10;
    else if (daysSinceAccess < 7) score += 5;
    
    // Bonus for milestone velocity
    if (progress.completedMilestones > 0) {
      score += progress.completedMilestones * 5;
    }

    return Math.min(Math.round(score), 100);
  }
}

export default new ProgressService();