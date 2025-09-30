/**
 * ICP Framework Controller
 * Generates personalized ICP rating frameworks based on product characteristics
 * Creates 6-category scoring systems with specific evaluation criteria
 */

import logger from '../utils/logger.js';

// In-memory cache for frameworks (will be replaced with Redis)
const frameworkCache = new Map();
const FRAMEWORK_CACHE_TTL = 86400000; // 24 hours

/**
 * Generate ICP rating framework based on product and market data
 */
export const generateFramework = async (req, res, next) => {
  try {
    const {
      productName,
      productDescription,
      targetMarket,
      keyFeatures,
      problemsSolved,
      customerProfile,
      forceRegenerate = false
    } = req.body;

    // Validate required fields
    if (!productName || !productDescription || !targetMarket) {
      return res.status(400).json({
        success: false,
        error: 'Product name, description, and target market are required'
      });
    }

    // Create cache key
    const cacheKey = `framework:${productName.toLowerCase()}:${targetMarket.toLowerCase()}`;

    // Check cache unless force regenerate
    if (!forceRegenerate && frameworkCache.has(cacheKey)) {
      const cached = frameworkCache.get(cacheKey);
      if (Date.now() - cached.timestamp < FRAMEWORK_CACHE_TTL) {
        logger.info(`Framework cache hit for ${productName}`);
        return res.json({
          success: true,
          framework: cached.framework,
          fromCache: true,
          cacheAge: Date.now() - cached.timestamp
        });
      }
    }

    logger.info(`Generating ICP framework for ${productName}`);

    // Generate the comprehensive framework
    const framework = {
      metadata: {
        productName,
        targetMarket,
        generatedAt: new Date().toISOString(),
        version: '1.0'
      },
      
      // 6 Main Rating Categories
      categories: [
        generateCompanyProfileCategory(targetMarket, customerProfile),
        generatePainUrgencyCategory(problemsSolved, productDescription),
        generateBudgetAuthorityCategory(targetMarket, customerProfile),
        generateTechFitCategory(keyFeatures, productDescription),
        generateTimelineCategory(problemsSolved, targetMarket),
        generateChampionCategory(targetMarket, customerProfile)
      ],

      // Scoring Configuration
      scoring: {
        weights: {
          companyProfile: 20,
          painUrgency: 25,
          budgetAuthority: 20,
          techFit: 15,
          timeline: 10,
          champion: 10
        },
        tiers: [
          {
            name: 'Tier 1 - Immediate Opportunity',
            minScore: 85,
            maxScore: 100,
            color: '#10B981',
            description: 'Perfect fit with urgent need and budget ready',
            actionPlan: 'Immediate executive outreach with custom demo'
          },
          {
            name: 'Tier 2 - Qualified Prospect',
            minScore: 70,
            maxScore: 84,
            color: '#3B82F6',
            description: 'Strong fit with clear pain points',
            actionPlan: 'Standard sales process with personalized approach'
          },
          {
            name: 'Tier 3 - Nurture Lead',
            minScore: 50,
            maxScore: 69,
            color: '#F59E0B',
            description: 'Potential fit but needs development',
            actionPlan: 'Add to nurture campaign with educational content'
          },
          {
            name: 'Tier 4 - Monitor',
            minScore: 0,
            maxScore: 49,
            color: '#EF4444',
            description: 'Poor fit or not ready',
            actionPlan: 'Low-touch monitoring for future changes'
          }
        ]
      },

      // Qualification Questions
      qualificationQuestions: generateQualificationQuestions(
        targetMarket,
        problemsSolved,
        keyFeatures
      ),

      // Disqualifiers
      disqualifiers: generateDisqualifiers(targetMarket, productDescription),

      // Ideal Customer Profile Summary
      idealProfile: generateIdealProfile(
        targetMarket,
        customerProfile,
        problemsSolved,
        keyFeatures
      )
    };

    // Cache the framework
    frameworkCache.set(cacheKey, {
      framework,
      timestamp: Date.now()
    });

    logger.info(`Framework generated successfully for ${productName}`);

    res.json({
      success: true,
      framework,
      generationMethod: 'intelligent-analysis'
    });

  } catch (error) {
    logger.error('Framework generation error:', error);
    next(error);
  }
};

/**
 * Generate Company Profile category with specific criteria
 */
function generateCompanyProfileCategory(targetMarket, customerProfile) {
  const criteria = [];
  
  // Industry fit
  criteria.push({
    name: 'Industry Alignment',
    description: `Company operates in ${targetMarket} or related industries`,
    weight: 5,
    scoringGuide: {
      10: `Core ${targetMarket} industry`,
      7: 'Adjacent or complementary industry',
      4: 'Somewhat related industry',
      0: 'Unrelated industry'
    }
  });

  // Company size based on target market
  const sizeRanges = determineSizeRanges(targetMarket);
  criteria.push({
    name: 'Company Size',
    description: `Employee count in optimal range for ${targetMarket}`,
    weight: 4,
    scoringGuide: {
      10: sizeRanges.optimal,
      7: sizeRanges.acceptable,
      4: sizeRanges.stretch,
      0: sizeRanges.poor
    }
  });

  // Growth stage
  criteria.push({
    name: 'Growth Stage',
    description: 'Company maturity and growth trajectory',
    weight: 3,
    scoringGuide: {
      10: 'Rapid growth phase (>30% YoY)',
      7: 'Steady growth (10-30% YoY)',
      4: 'Stable/mature (0-10% YoY)',
      0: 'Declining or distressed'
    }
  });

  // Geographic fit
  criteria.push({
    name: 'Geographic Fit',
    description: 'Location and market presence alignment',
    weight: 2,
    scoringGuide: {
      10: 'Primary markets with local presence',
      7: 'Primary markets, remote acceptable',
      4: 'Secondary markets',
      0: 'Outside service area'
    }
  });

  return {
    id: 'company-profile',
    name: 'Company Profile',
    description: 'Evaluate company characteristics and fit',
    weight: 20,
    criteria,
    maxScore: 100
  };
}

/**
 * Generate Pain & Urgency category
 */
function generatePainUrgencyCategory(problemsSolved, productDescription) {
  const criteria = [];
  
  // Problem severity
  criteria.push({
    name: 'Problem Severity',
    description: 'How critical is the problem to their business',
    weight: 6,
    scoringGuide: {
      10: 'Mission-critical, blocking business operations',
      7: 'Significant impact on efficiency or revenue',
      4: 'Moderate inconvenience or inefficiency',
      0: 'Nice-to-have or no clear problem'
    }
  });

  // Current solution pain
  criteria.push({
    name: 'Current Solution Pain',
    description: 'Dissatisfaction with existing approach',
    weight: 5,
    scoringGuide: {
      10: 'Actively looking to replace current solution',
      7: 'Expressed frustration with status quo',
      4: 'Some complaints but tolerable',
      0: 'Satisfied with current approach'
    }
  });

  // Cost of inaction
  criteria.push({
    name: 'Cost of Inaction',
    description: 'Financial or strategic impact of not solving',
    weight: 5,
    scoringGuide: {
      10: 'Losing >$100K/month or market share',
      7: 'Losing $10-100K/month in efficiency',
      4: 'Some opportunity cost but manageable',
      0: 'No measurable cost'
    }
  });

  // Urgency triggers
  criteria.push({
    name: 'Urgency Triggers',
    description: 'External or internal pressure to act',
    weight: 4,
    scoringGuide: {
      10: 'Regulatory deadline or competitor threat',
      7: 'Board/executive mandate to solve',
      4: 'Department goal or initiative',
      0: 'No specific timeline or trigger'
    }
  });

  return {
    id: 'pain-urgency',
    name: 'Pain & Urgency',
    description: 'Assess problem severity and urgency to solve',
    weight: 25,
    criteria,
    maxScore: 100
  };
}

/**
 * Generate Budget & Authority category
 */
function generateBudgetAuthorityCategory(targetMarket, customerProfile) {
  const criteria = [];
  
  // Budget availability
  criteria.push({
    name: 'Budget Availability',
    description: 'Confirmed budget for this type of solution',
    weight: 6,
    scoringGuide: {
      10: 'Budget approved and allocated',
      7: 'Budget identified, pending approval',
      4: 'Budget possible but not confirmed',
      0: 'No budget or unwilling to discuss'
    }
  });

  // Decision maker access
  criteria.push({
    name: 'Decision Maker Access',
    description: 'Direct access to economic buyer',
    weight: 5,
    scoringGuide: {
      10: 'Direct relationship with decision maker',
      7: 'One degree of separation',
      4: 'Multiple layers but path identified',
      0: 'No access to decision makers'
    }
  });

  // Procurement readiness
  criteria.push({
    name: 'Procurement Readiness',
    description: 'Ability to navigate purchasing process',
    weight: 4,
    scoringGuide: {
      10: 'Simple process or pre-approved vendor',
      7: 'Standard process, no major hurdles',
      4: 'Complex but navigable process',
      0: 'Procurement freeze or major barriers'
    }
  });

  // Financial health
  criteria.push({
    name: 'Financial Health',
    description: 'Company ability to pay',
    weight: 3,
    scoringGuide: {
      10: 'Strong financials, recent funding',
      7: 'Stable revenue and cash flow',
      4: 'Some financial constraints',
      0: 'Financial distress or uncertainty'
    }
  });

  return {
    id: 'budget-authority',
    name: 'Budget & Authority',
    description: 'Evaluate purchasing power and decision process',
    weight: 20,
    criteria,
    maxScore: 100
  };
}

/**
 * Generate Technical Fit category
 */
function generateTechFitCategory(keyFeatures, productDescription) {
  const criteria = [];
  
  // Technical requirements match
  criteria.push({
    name: 'Requirements Match',
    description: 'Product capabilities vs. their needs',
    weight: 5,
    scoringGuide: {
      10: 'Perfect match with all requirements',
      7: 'Meets core requirements well',
      4: 'Meets some requirements',
      0: 'Major gaps in requirements'
    }
  });

  // Integration compatibility
  criteria.push({
    name: 'Integration Compatibility',
    description: 'Fits with existing tech stack',
    weight: 4,
    scoringGuide: {
      10: 'Native integrations with their tools',
      7: 'API available, straightforward integration',
      4: 'Possible but requires work',
      0: 'Incompatible or major barriers'
    }
  });

  // Implementation complexity
  criteria.push({
    name: 'Implementation Complexity',
    description: 'Ease of deployment and adoption',
    weight: 3,
    scoringGuide: {
      10: 'Plug-and-play, minimal setup',
      7: 'Standard implementation, 1-2 weeks',
      4: 'Complex but manageable, 1-2 months',
      0: 'Very complex, 3+ months'
    }
  });

  // Technical team readiness
  criteria.push({
    name: 'Team Readiness',
    description: 'Internal capability to adopt',
    weight: 3,
    scoringGuide: {
      10: 'Expert team ready to implement',
      7: 'Capable team with some learning',
      4: 'Will need training and support',
      0: 'No technical resources available'
    }
  });

  return {
    id: 'tech-fit',
    name: 'Technical Fit',
    description: 'Assess technical compatibility and readiness',
    weight: 15,
    criteria,
    maxScore: 100
  };
}

/**
 * Generate Timeline category
 */
function generateTimelineCategory(problemsSolved, targetMarket) {
  const criteria = [];
  
  // Decision timeline
  criteria.push({
    name: 'Decision Timeline',
    description: 'When they plan to make a decision',
    weight: 4,
    scoringGuide: {
      10: 'Decision within 30 days',
      7: 'Decision within 90 days',
      4: 'Decision within 6 months',
      0: 'No timeline or 6+ months'
    }
  });

  // Implementation urgency
  criteria.push({
    name: 'Implementation Urgency',
    description: 'When solution needs to be live',
    weight: 3,
    scoringGuide: {
      10: 'Must be live within 30 days',
      7: 'Need live within 90 days',
      4: 'Prefer within 6 months',
      0: 'No urgency'
    }
  });

  // Competing priorities
  criteria.push({
    name: 'Competing Priorities',
    description: 'Other initiatives that might delay',
    weight: 3,
    scoringGuide: {
      10: 'Top priority, no competition',
      7: 'High priority, minimal competition',
      4: 'Medium priority, some competition',
      0: 'Low priority, many competing initiatives'
    }
  });

  return {
    id: 'timeline',
    name: 'Timeline',
    description: 'Evaluate decision and implementation timeline',
    weight: 10,
    criteria,
    maxScore: 100
  };
}

/**
 * Generate Champion category
 */
function generateChampionCategory(targetMarket, customerProfile) {
  const criteria = [];
  
  // Champion identification
  criteria.push({
    name: 'Champion Exists',
    description: 'Internal advocate for the solution',
    weight: 4,
    scoringGuide: {
      10: 'Strong champion actively pushing',
      7: 'Supportive contact developing into champion',
      4: 'Interested party but not yet advocate',
      0: 'No internal champion'
    }
  });

  // Champion influence
  criteria.push({
    name: 'Champion Influence',
    description: 'Champion ability to drive decision',
    weight: 3,
    scoringGuide: {
      10: 'Champion is decision maker',
      7: 'Champion has strong influence',
      4: 'Champion has some influence',
      0: 'Champion has no real influence'
    }
  });

  // Stakeholder alignment
  criteria.push({
    name: 'Stakeholder Alignment',
    description: 'Buy-in from key stakeholders',
    weight: 3,
    scoringGuide: {
      10: 'All stakeholders aligned',
      7: 'Most stakeholders supportive',
      4: 'Mixed support',
      0: 'Significant opposition'
    }
  });

  return {
    id: 'champion',
    name: 'Champion & Support',
    description: 'Evaluate internal support and advocacy',
    weight: 10,
    criteria,
    maxScore: 100
  };
}

/**
 * Determine optimal size ranges based on target market
 */
function determineSizeRanges(targetMarket) {
  const market = targetMarket.toLowerCase();
  
  if (market.includes('enterprise') || market.includes('fortune')) {
    return {
      optimal: '1000+ employees',
      acceptable: '500-1000 employees',
      stretch: '200-500 employees',
      poor: '<200 employees'
    };
  } else if (market.includes('mid-market') || market.includes('medium')) {
    return {
      optimal: '200-1000 employees',
      acceptable: '100-200 or 1000-2000 employees',
      stretch: '50-100 employees',
      poor: '<50 or >2000 employees'
    };
  } else if (market.includes('small') || market.includes('smb')) {
    return {
      optimal: '20-200 employees',
      acceptable: '10-20 or 200-500 employees',
      stretch: '5-10 employees',
      poor: '<5 or >500 employees'
    };
  } else if (market.includes('startup')) {
    return {
      optimal: '10-50 employees',
      acceptable: '5-10 or 50-100 employees',
      stretch: '2-5 employees',
      poor: '<2 or >100 employees'
    };
  } else {
    // Default to mid-market
    return {
      optimal: '50-500 employees',
      acceptable: '20-50 or 500-1000 employees',
      stretch: '10-20 employees',
      poor: '<10 or >1000 employees'
    };
  }
}

/**
 * Generate qualification questions for sales teams
 */
function generateQualificationQuestions(targetMarket, problemsSolved, keyFeatures) {
  const questions = [];
  
  // Discovery questions
  questions.push({
    category: 'Discovery',
    questions: [
      `What specific challenges are you facing with ${problemsSolved || 'this area'}?`,
      'How are you currently handling this process?',
      'What impact is this having on your business?',
      'What would success look like for you?'
    ]
  });

  // Budget questions
  questions.push({
    category: 'Budget',
    questions: [
      'What budget range have you allocated for solving this problem?',
      'What is the cost of not solving this problem?',
      'Who else needs to be involved in the budget discussion?',
      'What is your typical procurement process for solutions like this?'
    ]
  });

  // Authority questions
  questions.push({
    category: 'Authority',
    questions: [
      'Who will be the primary decision maker for this initiative?',
      'What other stakeholders need to be involved?',
      'What is your decision-making process?',
      'What criteria will you use to evaluate solutions?'
    ]
  });

  // Timeline questions
  questions.push({
    category: 'Timeline',
    questions: [
      'When do you need this solution implemented?',
      'What is driving this timeline?',
      'What happens if you miss this deadline?',
      'What other initiatives might affect this timeline?'
    ]
  });

  return questions;
}

/**
 * Generate disqualifiers
 */
function generateDisqualifiers(targetMarket, productDescription) {
  const disqualifiers = [];
  
  // Common disqualifiers
  disqualifiers.push({
    factor: 'Company Size',
    condition: 'Less than 5 employees',
    reason: 'Too small to benefit from the solution'
  });

  disqualifiers.push({
    factor: 'Industry',
    condition: 'Government or highly regulated industries',
    reason: 'Compliance requirements not yet met'
  });

  disqualifiers.push({
    factor: 'Geography',
    condition: 'Outside primary service regions',
    reason: 'Cannot provide adequate support'
  });

  disqualifiers.push({
    factor: 'Technical',
    condition: 'Incompatible technical infrastructure',
    reason: 'Integration not possible with current architecture'
  });

  disqualifiers.push({
    factor: 'Budget',
    condition: 'Budget below minimum viable price point',
    reason: 'Cannot deliver value at their budget level'
  });

  return disqualifiers;
}

/**
 * Generate ideal customer profile summary
 */
function generateIdealProfile(targetMarket, customerProfile, problemsSolved, keyFeatures) {
  return {
    summary: `The ideal customer for this solution is a ${targetMarket} company experiencing ${problemsSolved || 'operational challenges'}. They need ${keyFeatures || 'advanced capabilities'} and have the budget and authority to implement within 90 days.`,
    
    characteristics: {
      demographic: {
        size: determineSizeRanges(targetMarket).optimal,
        industry: targetMarket,
        geography: 'Primary markets',
        growth: 'Growing 20%+ annually'
      },
      
      technographic: {
        techStack: 'Modern cloud infrastructure',
        maturity: 'Digital transformation underway',
        integration: 'API-first architecture',
        resources: 'Technical team available'
      },
      
      behavioral: {
        buyingProcess: 'Defined but flexible',
        decisionSpeed: 'Can move within 90 days',
        innovation: 'Early adopter mindset',
        partnership: 'Values strategic vendors'
      },
      
      situational: {
        trigger: 'Growth pain or competitive pressure',
        urgency: 'Need solution within 6 months',
        budget: 'Allocated or can be allocated',
        champion: 'Internal advocate identified'
      }
    }
  };
}

/**
 * Get a specific framework from cache
 */
export const getFramework = async (req, res, next) => {
  try {
    const { productName, targetMarket } = req.params;
    
    const cacheKey = `framework:${productName.toLowerCase()}:${targetMarket.toLowerCase()}`;
    
    if (frameworkCache.has(cacheKey)) {
      const cached = frameworkCache.get(cacheKey);
      return res.json({
        success: true,
        framework: cached.framework,
        fromCache: true,
        cacheAge: Date.now() - cached.timestamp
      });
    }
    
    res.status(404).json({
      success: false,
      error: 'Framework not found. Please generate it first.'
    });
    
  } catch (error) {
    logger.error('Get framework error:', error);
    next(error);
  }
};

/**
 * List all cached frameworks
 */
export const listFrameworks = async (req, res, next) => {
  try {
    const frameworks = [];
    
    for (const [key, value] of frameworkCache.entries()) {
      if (key.startsWith('framework:')) {
        frameworks.push({
          productName: value.framework.metadata.productName,
          targetMarket: value.framework.metadata.targetMarket,
          generatedAt: value.framework.metadata.generatedAt,
          cacheAge: Date.now() - value.timestamp
        });
      }
    }
    
    res.json({
      success: true,
      frameworks,
      total: frameworks.length
    });
    
  } catch (error) {
    logger.error('List frameworks error:', error);
    next(error);
  }
};

/**
 * Clear framework cache
 */
export const clearFrameworkCache = async (req, res, next) => {
  try {
    const { productName } = req.body;
    
    if (productName) {
      // Clear specific product frameworks
      const keysToDelete = [];
      for (const key of frameworkCache.keys()) {
        if (key.includes(productName.toLowerCase())) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => frameworkCache.delete(key));
      
      res.json({
        success: true,
        message: `Framework cache cleared for ${productName}`,
        keysCleared: keysToDelete.length
      });
    } else {
      // Clear all frameworks
      const size = frameworkCache.size;
      frameworkCache.clear();
      
      res.json({
        success: true,
        message: 'All framework cache cleared',
        keysCleared: size
      });
    }
  } catch (error) {
    logger.error('Clear framework cache error:', error);
    next(error);
  }
};

export default {
  generateFramework,
  getFramework,
  listFrameworks,
  clearFrameworkCache
};