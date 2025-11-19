/**
 * Empathy Context Extractor Service
 *
 * Extracts empathy and Critical Need Context from user's generated resources
 * for injection into ALL resource generation prompts.
 *
 * Naming Standards:
 * - "Core Worry" (not "3 AM Fear")
 * - "Critical Need Context" (not "Desert Context")
 *
 * Priority 1 Implementation: Integrate Emotional Empathy Framework
 */

import logger from '../utils/logger.js';
import {
  extractCoreWorry,
  extractEmotionalPains,
  extractDesiredGains,
  formatEmpathyContext,
  formatCriticalNeedContext
} from '../config/empathy-framework-types.js';

/**
 * Empathy Context Extractor
 * Pulls emotional resonance data from existing resources
 */
class EmpathyContextExtractor {
  /**
   * Extract complete empathy context for resource generation
   *
   * @param {Object[]} userResources - All user's generated resources
   * @returns {Object} Empathy context ready for prompt injection
   */
  extractEmpathyContext(userResources) {
    try {
      // Extract from target-buyer-personas resource
      const personasResource = userResources.find(r => r.resource_id === 'target-buyer-personas');

      if (!personasResource || !personasResource.content) {
        logger.info('No buyer personas found - empathy context will be generic');
        return null;
      }

      const personas = personasResource.content.personas || [];

      if (personas.length === 0) {
        logger.warn('Buyer personas resource exists but contains no personas');
        return null;
      }

      // Use primary persona (first one)
      const primaryPersona = personas[0];

      // Extract empathy map
      const empathyMap = primaryPersona.empathyMap;

      if (!empathyMap) {
        logger.info('Primary persona has no empathy map - using basic fields');
        return this._extractBasicEmpathyContext(primaryPersona);
      }

      // Extract Core Worry
      const coreWorry = extractCoreWorry(empathyMap);

      if (!coreWorry) {
        logger.warn('Empathy map exists but no Core Worry found in thinkAndFeel');
        return this._extractBasicEmpathyContext(primaryPersona);
      }

      // Build complete empathy context
      const empathyContext = {
        // Core fields
        persona: {
          name: primaryPersona.name || 'Primary Buyer',
          title: primaryPersona.title || 'Decision Maker',
          role: primaryPersona.role || 'Unknown'
        },

        // Emotional drivers
        coreWorry,
        hiddenAmbition: primaryPersona.hiddenAmbitions?.[0] || null,
        failureConsequence: primaryPersona.failureConsequences?.[0] || null,

        // Empathy map details
        emotionalPains: extractEmotionalPains(empathyMap),
        desiredGains: extractDesiredGains(empathyMap),
        observableReality: empathyMap.see || [],
        externalFeedback: empathyMap.hear || [],

        // Public vs Private behavior (helps understand hidden motivations)
        publicBehavior: empathyMap.sayAndDo?.public || [],
        privateBehavior: empathyMap.sayAndDo?.private || [],

        // Career context
        careerStage: primaryPersona.careerStage || null,
        successMetrics: primaryPersona.successMetrics || []
      };

      logger.info(`Empathy context extracted for ${empathyContext.persona.name} (${empathyContext.persona.title})`);
      logger.info(`Core Worry: "${coreWorry.substring(0, 80)}..."`);

      return empathyContext;
    } catch (error) {
      logger.error(`Error extracting empathy context: ${error.message}`, { error });
      return null;
    }
  }

  /**
   * Extract Critical Need Context (urgency/survival timeline)
   *
   * @param {Object[]} userResources - All user's generated resources
   * @returns {Object} Critical Need Context ready for prompt injection
   */
  extractCriticalNeedContext(userResources) {
    try {
      // Extract from icp-analysis resource
      const icpResource = userResources.find(r => r.resource_id === 'icp-analysis');

      if (!icpResource || !icpResource.content) {
        logger.info('No ICP analysis found - Critical Need Context will be unavailable');
        return null;
      }

      // Check if Critical Need Context is defined
      const criticalNeedContext = icpResource.content.criticalNeedContext;

      if (!criticalNeedContext) {
        logger.info('ICP analysis exists but no Critical Need Context defined');
        return null;
      }

      // Validate required fields
      if (!criticalNeedContext.runwayMonths || !criticalNeedContext.fundingPressure) {
        logger.warn('Critical Need Context missing required fields (runwayMonths or fundingPressure)');
        return null;
      }

      // Build complete Critical Need Context
      const context = {
        // Urgency framework
        urgency: {
          runwayMonths: criticalNeedContext.runwayMonths,
          fundingPressure: criticalNeedContext.fundingPressure,
          timeframeLabel: this._getTimeframeLabel(criticalNeedContext.runwayMonths)
        },

        // Board/stakeholder pressure
        boardMilestones: criticalNeedContext.boardMilestones || [],
        recentHires: criticalNeedContext.recentHires || [],

        // Observable pain signals
        observablePainSignals: criticalNeedContext.observablePainSignals || [],

        // Critical success metrics with deadlines
        criticalMetrics: (criticalNeedContext.criticalSuccessMetrics || []).map(metric => ({
          metric: metric.metric,
          deadline: metric.deadline,
          impact: metric.impact,
          urgencyLevel: this._calculateUrgencyLevel(metric.deadline)
        })),

        // Primary critical metric (first one)
        primaryMetric: criticalNeedContext.criticalSuccessMetrics?.[0] || null
      };

      logger.info(`Critical Need Context extracted: ${context.urgency.runwayMonths} months runway, funding pressure: "${context.urgency.fundingPressure}"`);

      if (context.primaryMetric) {
        logger.info(`Primary critical metric: ${context.primaryMetric.metric} (deadline: ${context.primaryMetric.deadline})`);
      }

      return context;
    } catch (error) {
      logger.error(`Error extracting Critical Need Context: ${error.message}`, { error });
      return null;
    }
  }

  /**
   * Extract combined context (empathy + critical need)
   *
   * @param {Object[]} userResources - All user's generated resources
   * @returns {Object} Complete context for empathy-driven generation
   */
  extractCombinedContext(userResources) {
    const empathyContext = this.extractEmpathyContext(userResources);
    const criticalNeedContext = this.extractCriticalNeedContext(userResources);

    return {
      empathy: empathyContext,
      criticalNeed: criticalNeedContext,
      hasEmpathyContext: !!empathyContext,
      hasCriticalNeedContext: !!criticalNeedContext,
      isFullyEnhanced: !!empathyContext && !!criticalNeedContext
    };
  }

  /**
   * Format context for AI prompt injection
   *
   * @param {Object} combinedContext - Combined empathy + critical need context
   * @returns {string} Formatted prompt section
   */
  formatForPrompt(combinedContext) {
    if (!combinedContext.hasEmpathyContext && !combinedContext.hasCriticalNeedContext) {
      return ''; // No empathy enhancement available
    }

    let promptSection = '\n## EMPATHY-DRIVEN CONTEXT\n\n';

    // Add empathy context
    if (combinedContext.empathy) {
      const e = combinedContext.empathy;

      promptSection += `### TARGET BUYER EMOTIONAL PROFILE\n`;
      promptSection += `- Name: ${e.persona.name}\n`;
      promptSection += `- Title: ${e.persona.title}\n`;
      promptSection += `- Core Worry: "${e.coreWorry}"\n`;

      if (e.hiddenAmbition) {
        promptSection += `- Hidden Ambition: "${e.hiddenAmbition}"\n`;
      }

      if (e.failureConsequence) {
        promptSection += `- Failure Consequence: "${e.failureConsequence}"\n`;
      }

      if (e.emotionalPains.length > 0) {
        promptSection += `- Emotional Pains: ${e.emotionalPains.map(p => `"${p}"`).join(', ')}\n`;
      }

      if (e.desiredGains.length > 0) {
        promptSection += `- Desired Relief: ${e.desiredGains.map(g => `"${g}"`).join(', ')}\n`;
      }

      promptSection += '\n';
    }

    // Add Critical Need Context
    if (combinedContext.criticalNeed) {
      const c = combinedContext.criticalNeed;

      promptSection += `### CRITICAL NEED CONTEXT (URGENCY)\n`;
      promptSection += `- Runway: ${c.urgency.runwayMonths} months (${c.urgency.timeframeLabel})\n`;
      promptSection += `- Funding Pressure: ${c.urgency.fundingPressure}\n`;

      if (c.primaryMetric) {
        promptSection += `- Critical Metric: ${c.primaryMetric.metric}\n`;
        promptSection += `- Deadline: ${c.primaryMetric.deadline}\n`;
        promptSection += `- Impact: ${c.primaryMetric.impact}\n`;
      }

      if (c.boardMilestones.length > 0) {
        promptSection += `- Board Milestones: ${c.boardMilestones.join(', ')}\n`;
      }

      if (c.observablePainSignals.length > 0) {
        promptSection += `- Observable Pain Signals: ${c.observablePainSignals.join('; ')}\n`;
      }

      promptSection += '\n';
    }

    // Add generation guidance
    promptSection += `### EMPATHY-DRIVEN GENERATION REQUIREMENTS\n\n`;
    promptSection += `You MUST generate content that:\n\n`;

    if (combinedContext.empathy) {
      promptSection += `1. **Addresses Core Worry**: Connect directly to "${combinedContext.empathy.coreWorry.substring(0, 60)}..."\n`;
      promptSection += `2. **Provides Emotional Relief**: Show how this solution lifts the burden (use "I stop..." language)\n`;

      if (combinedContext.empathy.hiddenAmbition) {
        promptSection += `3. **Articulates Career Win**: Tie to hidden ambition: "${combinedContext.empathy.hiddenAmbition}"\n`;
      }
    }

    if (combinedContext.criticalNeed && combinedContext.criticalNeed.primaryMetric) {
      promptSection += `4. **Maps to Critical Timeline**: Connect to ${combinedContext.criticalNeed.primaryMetric.deadline} deadline for "${combinedContext.criticalNeed.primaryMetric.metric}"\n`;
      promptSection += `5. **Shows Survival Impact**: Explain how this affects runway/funding: "${combinedContext.criticalNeed.primaryMetric.impact}"\n`;
    }

    promptSection += `\n**Tone**: Empathetic, urgent (survival timeline), career-focused\n`;
    promptSection += `**Avoid**: Generic pain points, jargon, feature lists without emotional context\n\n`;

    return promptSection;
  }

  /**
   * Extract basic empathy context from persona without full empathy map
   * Fallback for personas created before empathy framework
   *
   * @param {Object} persona - Basic persona object
   * @returns {Object} Basic empathy context
   * @private
   */
  _extractBasicEmpathyContext(persona) {
    return {
      persona: {
        name: persona.name || 'Primary Buyer',
        title: persona.title || 'Decision Maker',
        role: persona.role || 'Unknown'
      },
      coreWorry: persona.painPoints?.[0] || 'Unknown concern',
      hiddenAmbition: persona.goals?.[0] || null,
      failureConsequence: null,
      emotionalPains: persona.painPoints || [],
      desiredGains: persona.goals || [],
      observableReality: [],
      externalFeedback: [],
      publicBehavior: [],
      privateBehavior: [],
      careerStage: null,
      successMetrics: [],
      isBasicFallback: true
    };
  }

  /**
   * Get human-readable timeframe label
   *
   * @param {number} months - Runway in months
   * @returns {string} Timeframe label
   * @private
   */
  _getTimeframeLabel(months) {
    if (months <= 6) return 'Critical urgency';
    if (months <= 12) return 'High urgency';
    if (months <= 18) return 'Moderate urgency';
    return 'Planning horizon';
  }

  /**
   * Calculate urgency level from deadline string
   *
   * @param {string} deadline - Deadline string (e.g., "90 days", "3 months")
   * @returns {string} Urgency level
   * @private
   */
  _calculateUrgencyLevel(deadline) {
    const lower = deadline.toLowerCase();

    if (lower.includes('day') || lower.includes('week')) {
      return 'Critical';
    }

    if (lower.includes('30') || lower.includes('60') || lower.includes('90')) {
      return 'High';
    }

    if (lower.includes('month') || lower.includes('quarter')) {
      return 'Moderate';
    }

    return 'Normal';
  }
}

// Export singleton instance
export default new EmpathyContextExtractor();
