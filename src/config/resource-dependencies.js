/**
 * Resource Dependencies Configuration
 *
 * Defines the complete dependency chain for all 77 AI-generated resources
 * in the Andru Revenue Intelligence Platform's cumulative intelligence system.
 *
 * Each resource builds on previously generated insights, creating exponentially
 * deeper personalization with every generation.
 *
 * @see /COMPLETE_RESOURCE_LIBRARY_MAPPING.md for full documentation
 * @see /DEPENDENCY_VALIDATION_SYSTEM.md for validation logic
 */

/**
 * Resource dependency configuration
 * @typedef {Object} ResourceDependency
 * @property {string} resourceId - Unique identifier matching prompt filename
 * @property {string} resourceName - Human-readable name
 * @property {number} tier - Dependency tier (0-8) based on hierarchy
 * @property {string} category - Resource category
 * @property {string[]} requiredDependencies - Must exist before generation (blocking)
 * @property {string[]} optionalDependencies - Enhance output but not required
 * @property {number} estimatedTokens - Estimated token count for output
 * @property {number} generationCost - Estimated API cost in USD
 * @property {string} impactStatement - One-sentence value description
 */

/**
 * Complete resource dependency registry
 * Maps all 77 resources with their dependencies, tiers, and metadata
 */
export const RESOURCE_DEPENDENCIES = {
  // ============================================
  // TIER 1: CORE FOUNDATION (5 resources)
  // ============================================

  'icp-analysis': {
    resourceId: 'icp-analysis',
    resourceName: 'ICP Analysis',
    tier: 1,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'current-business-stage'],
    optionalDependencies: [],
    estimatedTokens: 1200,
    generationCost: 0.0036,
    impactStatement: 'Defines your ideal customer with surgical precision, eliminating wasted sales effort on bad-fit prospects.'
  },

  'target-buyer-personas': {
    resourceId: 'target-buyer-personas',
    resourceName: 'Target Buyer Personas',
    tier: 1,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'icp-analysis'],
    optionalDependencies: [],
    estimatedTokens: 1500,
    generationCost: 0.0045,
    impactStatement: 'Brings your target buyers to life as real people with specific fears, goals, and communication preferences.'
  },

  'empathy-maps': {
    resourceId: 'empathy-maps',
    resourceName: 'Empathy Maps',
    tier: 1,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'icp-analysis', 'target-buyer-personas'],
    optionalDependencies: [],
    estimatedTokens: 1400,
    generationCost: 0.0042,
    impactStatement: 'Reveals the hidden psychological terrain of your buyers—what they see, hear, think, feel, say, do, fear, and desire.'
  },

  'refined-product-description': {
    resourceId: 'refined-product-description',
    resourceName: 'Refined Product Description',
    tier: 1,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'primary-benefit'],
    optionalDependencies: [],
    estimatedTokens: 800,
    generationCost: 0.0024,
    impactStatement: 'Translates technical jargon into clear business language that enterprise buyers immediately understand.'
  },

  'value-messaging': {
    resourceId: 'value-messaging',
    resourceName: 'Value Messaging',
    tier: 1,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'icp-analysis', 'target-buyer-personas'],
    optionalDependencies: [],
    estimatedTokens: 1300,
    generationCost: 0.0039,
    impactStatement: 'Creates persona-aligned value propositions, SEO keywords, messaging phrases, and outreach email templates.'
  },

  // ============================================
  // TIER 2: BUYER INTELLIGENCE (4 resources)
  // ============================================

  'icp-rating-system': {
    resourceId: 'icp-rating-system',
    resourceName: 'ICP Rating System',
    tier: 2,
    category: 'core',
    requiredDependencies: ['product-description', 'icp-analysis'],
    optionalDependencies: ['target-buyer-personas'],
    estimatedTokens: 1100,
    generationCost: 0.0033,
    impactStatement: 'Transforms abstract ICP criteria into a concrete scoring framework that prioritizes your highest-value prospects.'
  },

  'buyer-persona-rating': {
    resourceId: 'buyer-persona-rating',
    resourceName: 'Buyer Persona Rating',
    tier: 2,
    category: 'core',
    requiredDependencies: ['product-description', 'target-buyer-personas'],
    optionalDependencies: ['empathy-maps'],
    estimatedTokens: 1000,
    generationCost: 0.003,
    impactStatement: 'Scores individual contacts on persona alignment, ensuring your sales team focuses on the right people.'
  },

  'negative-buyer-personas': {
    resourceId: 'negative-buyer-personas',
    resourceName: 'Negative Buyer Personas',
    tier: 2,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'icp-analysis'],
    optionalDependencies: ['target-buyer-personas'],
    estimatedTokens: 900,
    generationCost: 0.0027,
    impactStatement: 'Identifies bad-fit buyers within your ICP, preventing wasted cycles on prospects who will never close.'
  },

  'non-ideal-customer-profile': {
    resourceId: 'non-ideal-customer-profile',
    resourceName: 'Non-Ideal Customer Profile',
    tier: 2,
    category: 'core',
    requiredDependencies: ['product-description', 'icp-analysis', 'current-business-stage'],
    optionalDependencies: ['target-buyer-personas'],
    estimatedTokens: 1000,
    generationCost: 0.003,
    impactStatement: 'Defines which industries, company stages, and budget constraints to avoid entirely.'
  },

  // ============================================
  // TIER 3: SCORING & PRIORITIZATION (4 resources)
  // ============================================

  'compelling-events': {
    resourceId: 'compelling-events',
    resourceName: 'Compelling Events',
    tier: 3,
    category: 'core',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'icp-analysis', 'empathy-maps'],
    optionalDependencies: ['value-messaging'],
    estimatedTokens: 1200,
    generationCost: 0.0036,
    impactStatement: 'Identifies the specific triggers that make buyers urgently seek your solution right now.'
  },

  'cost-of-inaction-calculator': {
    resourceId: 'cost-of-inaction-calculator',
    resourceName: 'Cost of Inaction Calculator',
    tier: 3,
    category: 'core',
    requiredDependencies: ['icp-analysis', 'product-description'],
    optionalDependencies: ['target-buyer-personas', 'compelling-events'],
    estimatedTokens: 1500,
    generationCost: 0.0045,
    impactStatement: 'Quantifies the financial and competitive risks of delayed action, creating undeniable urgency.'
  },

  'product-potential-assessment': {
    resourceId: 'product-potential-assessment',
    resourceName: 'Product Potential Assessment',
    tier: 3,
    category: 'core',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'startup-stage'],
    optionalDependencies: ['icp-analysis', 'value-messaging'],
    estimatedTokens: 1100,
    generationCost: 0.0033,
    impactStatement: 'Categorizes your product and identifies its unique differentiator and tangible benefits.'
  },

  'product-value-statistics': {
    resourceId: 'product-value-statistics',
    resourceName: 'Product Value Statistics',
    tier: 3,
    category: 'core',
    requiredDependencies: ['product-description', 'target-buyer-personas'],
    optionalDependencies: ['icp-analysis', 'value-messaging'],
    estimatedTokens: 1000,
    generationCost: 0.003,
    impactStatement: 'Arms your sales team with 8-10 credible statistics that prove your product\'s market potential.'
  },

  // ============================================
  // TIER 4: VALUE COMMUNICATION (4 resources)
  // ============================================

  'pmf-assessment': {
    resourceId: 'pmf-assessment',
    resourceName: 'PMF Assessment',
    tier: 4,
    category: 'core',
    requiredDependencies: ['product-description', 'target-buyer-description', 'icp-analysis', 'startup-stage'],
    optionalDependencies: ['target-buyer-personas', 'empathy-maps'],
    estimatedTokens: 1300,
    generationCost: 0.0039,
    impactStatement: 'Assesses your product-market fit with actionable gaps and improvement actions.'
  },

  'pmf-readiness-assessment': {
    resourceId: 'pmf-readiness-assessment',
    resourceName: 'PMF Readiness Assessment',
    tier: 4,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'product-category', 'product-unique-differentiator', 'product-tangible-benefits', 'target-buyer-personas'],
    optionalDependencies: ['icp-analysis', 'pmf-assessment'],
    estimatedTokens: 1400,
    generationCost: 0.0042,
    impactStatement: 'Evaluates your readiness for product-market fit across 8 critical dimensions with concrete next steps.'
  },

  'potential-customers-list': {
    resourceId: 'potential-customers-list',
    resourceName: 'Potential Customers List',
    tier: 4,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'icp-analysis', 'pmf-assessment'],
    optionalDependencies: ['target-buyer-personas', 'compelling-events'],
    estimatedTokens: 1800,
    generationCost: 0.0054,
    impactStatement: 'Provides 20 specific target companies (10 private, 10 public) with compelling reasons to contact them now.'
  },

  'willingness-to-pay': {
    resourceId: 'willingness-to-pay',
    resourceName: 'Willingness to Pay',
    tier: 4,
    category: 'core',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'product-value-proposition', 'icp-analysis'],
    optionalDependencies: ['value-messaging', 'cost-of-inaction-calculator'],
    estimatedTokens: 1200,
    generationCost: 0.0036,
    impactStatement: 'Determines optimal pricing strategy with specific price ranges buyers will accept.'
  },

  // ============================================
  // TIER 5: SALES ENABLEMENT (4 resources)
  // ============================================

  'sales-slide-deck': {
    resourceId: 'sales-slide-deck',
    resourceName: 'Sales Slide Deck',
    tier: 5,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'target-buyer-personas', 'value-messaging', 'icp-analysis'],
    optionalDependencies: ['empathy-maps', 'compelling-events', 'cost-of-inaction-calculator'],
    estimatedTokens: 2500,
    generationCost: 0.0075,
    impactStatement: 'Provides three executive-ready presentation decks (discovery, demo, closing) for enterprise sales cycles.'
  },

  'sales-tasks-basic': {
    resourceId: 'sales-tasks-basic',
    resourceName: 'Sales Tasks (Basic)',
    tier: 5,
    category: 'core',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'startup-stage', 'business-goal'],
    optionalDependencies: ['icp-analysis', 'value-messaging'],
    estimatedTokens: 1100,
    generationCost: 0.0033,
    impactStatement: 'Prioritizes 4-6 critical sales tasks that will achieve your business goal in the least amount of time.'
  },

  'technical-sales-translator': {
    resourceId: 'technical-sales-translator',
    resourceName: 'Technical Sales Translator',
    tier: 5,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'target-buyer-personas', 'icp-analysis'],
    optionalDependencies: ['empathy-maps', 'value-messaging'],
    estimatedTokens: 1400,
    generationCost: 0.0042,
    impactStatement: 'Transforms technical features into compelling benefits that resonate with specific buyer personas.'
  },

  'product-market-clarity-translation': {
    resourceId: 'product-market-clarity-translation',
    resourceName: 'Product-Market Clarity Translation',
    tier: 5,
    category: 'core',
    requiredDependencies: ['product-name', 'product-description', 'target-buyer-personas', 'icp-analysis'],
    optionalDependencies: ['empathy-maps', 'desert-context'],
    estimatedTokens: 1600,
    generationCost: 0.0048,
    impactStatement: 'Translates technical capabilities into emotionally resonant four-layer messaging that addresses 3 AM fears and career wins.'
  },

  // ============================================
  // TIER 6: ADVANCED ENTERPRISE (8 resources)
  // ============================================

  'buyer-ux-considerations': {
    resourceId: 'buyer-ux-considerations',
    resourceName: 'Buyer UX Considerations',
    tier: 6,
    category: 'advanced',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'user-journey-maps'],
    optionalDependencies: ['empathy-maps', 'day-in-life'],
    estimatedTokens: 1300,
    generationCost: 0.0039,
    impactStatement: 'Identifies UX friction points that prevent buyers from experiencing your product\'s value.'
  },

  'buying-committee-navigation-guide': {
    resourceId: 'buying-committee-navigation-guide',
    resourceName: 'Buying Committee Navigation Guide',
    tier: 6,
    category: 'advanced',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'icp-analysis'],
    optionalDependencies: ['empathy-maps', 'stakeholder-arsenal'],
    estimatedTokens: 1500,
    generationCost: 0.0045,
    impactStatement: 'Maps the 4-5 key stakeholders in enterprise deals and provides multi-threading strategies.'
  },

  'day-in-life': {
    resourceId: 'day-in-life',
    resourceName: 'Day in the Life',
    tier: 6,
    category: 'advanced',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'empathy-maps'],
    optionalDependencies: ['user-journey-maps'],
    estimatedTokens: 1600,
    generationCost: 0.0048,
    impactStatement: 'Reveals 10-30 minute moments where your product intersects with buyer\'s daily reality.'
  },

  'detailed-service-prototype': {
    resourceId: 'detailed-service-prototype',
    resourceName: 'Detailed Service Prototype',
    tier: 8,
    category: 'advanced',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'service-blueprints'],
    optionalDependencies: ['user-journey-maps', 'backstage-process-optimization'],
    estimatedTokens: 1700,
    generationCost: 0.0051,
    impactStatement: 'Creates detailed service design prototypes showing front-stage and back-stage processes.'
  },

  'ideal-head-of-sales': {
    resourceId: 'ideal-head-of-sales',
    resourceName: 'Ideal Head of Sales',
    tier: 6,
    category: 'advanced',
    requiredDependencies: ['product-description', 'icp-analysis', 'target-buyer-personas', 'startup-stage'],
    optionalDependencies: ['sales-tasks-basic', 'value-messaging'],
    estimatedTokens: 1200,
    generationCost: 0.0036,
    impactStatement: 'Defines the ideal sales leader profile for your product, stage, and market.'
  },

  'mock-problem-validation': {
    resourceId: 'mock-problem-validation',
    resourceName: 'Mock Problem Validation',
    tier: 6,
    category: 'advanced',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'empathy-maps'],
    optionalDependencies: ['compelling-events', 'day-in-life'],
    estimatedTokens: 1400,
    generationCost: 0.0042,
    impactStatement: 'Simulates customer validation interviews to test problem hypotheses before building.'
  },

  'mock-selling-dialogues': {
    resourceId: 'mock-selling-dialogues',
    resourceName: 'Mock Selling Dialogues',
    tier: 6,
    category: 'advanced',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'value-messaging'],
    optionalDependencies: ['empathy-maps', 'compelling-events', 'sales-slide-deck'],
    estimatedTokens: 1800,
    generationCost: 0.0054,
    impactStatement: 'Provides realistic sales dialogue scripts with objection handling for different personas.'
  },

  'month-in-life': {
    resourceId: 'month-in-life',
    resourceName: 'Month in the Life',
    tier: 6,
    category: 'advanced',
    requiredDependencies: ['product-description', 'target-buyer-personas', 'empathy-maps', 'day-in-life'],
    optionalDependencies: ['user-journey-maps', 'compelling-events'],
    estimatedTokens: 2000,
    generationCost: 0.006,
    impactStatement: 'Maps monthly rhythms, quarterly pressures, and seasonal triggers that drive buying behavior.'
  },

  // NOTE: Full implementation continues with all 77 resources
  // Abbreviated here for initial deployment - remaining resources follow same pattern
  // See COMPLETE_RESOURCE_LIBRARY_MAPPING.md for complete list

  // Placeholder entries for remaining resources (to be fully implemented)
  'persona-based-prototyping': { resourceId: 'persona-based-prototyping', resourceName: 'Persona-Based Prototyping', tier: 6, category: 'advanced', requiredDependencies: ['target-buyer-personas'], optionalDependencies: [], estimatedTokens: 1500, generationCost: 0.0045, impactStatement: 'TBD' },
  'product-potential-advanced': { resourceId: 'product-potential-advanced', resourceName: 'Product Potential (Advanced)', tier: 6, category: 'advanced', requiredDependencies: ['product-potential-assessment'], optionalDependencies: [], estimatedTokens: 1400, generationCost: 0.0042, impactStatement: 'TBD' },
  'product-usage-assessments': { resourceId: 'product-usage-assessments', resourceName: 'Product Usage Assessments', tier: 6, category: 'advanced', requiredDependencies: ['product-description'], optionalDependencies: [], estimatedTokens: 1300, generationCost: 0.0039, impactStatement: 'TBD' },
  'product-usage-timing-assessment': { resourceId: 'product-usage-timing-assessment', resourceName: 'Product Usage Timing Assessment', tier: 6, category: 'advanced', requiredDependencies: ['product-description'], optionalDependencies: [], estimatedTokens: 1200, generationCost: 0.0036, impactStatement: 'TBD' },
  'sales-tasks-advanced': { resourceId: 'sales-tasks-advanced', resourceName: 'Sales Tasks (Advanced)', tier: 6, category: 'advanced', requiredDependencies: ['sales-tasks-basic'], optionalDependencies: [], estimatedTokens: 1400, generationCost: 0.0042, impactStatement: 'TBD' },
  'stakeholder-arsenal': { resourceId: 'stakeholder-arsenal', resourceName: 'Stakeholder Arsenal', tier: 6, category: 'advanced', requiredDependencies: ['target-buyer-personas'], optionalDependencies: [], estimatedTokens: 1500, generationCost: 0.0045, impactStatement: 'TBD' },
  'user-journey-maps': { resourceId: 'user-journey-maps', resourceName: 'User Journey Maps', tier: 6, category: 'advanced', requiredDependencies: ['target-buyer-personas', 'empathy-maps'], optionalDependencies: [], estimatedTokens: 1600, generationCost: 0.0048, impactStatement: 'TBD' },

  // TIER 7: STRATEGIC PLANNING (11 resources) - Including service-blueprints foundation
  'service-blueprints': { resourceId: 'service-blueprints', resourceName: 'Service Blueprints', tier: 7, category: 'strategic', requiredDependencies: ['product-description', 'target-buyer-personas'], optionalDependencies: [], estimatedTokens: 1600, generationCost: 0.0048, impactStatement: 'TBD' },
  'backstage-process-optimization': { resourceId: 'backstage-process-optimization', resourceName: 'Backstage Process Optimization', tier: 8, category: 'strategic', requiredDependencies: ['service-blueprints'], optionalDependencies: [], estimatedTokens: 1400, generationCost: 0.0042, impactStatement: 'TBD' },
  'service-fmea': { resourceId: 'service-fmea', resourceName: 'Service FMEA', tier: 8, category: 'strategic', requiredDependencies: ['service-blueprints'], optionalDependencies: [], estimatedTokens: 1400, generationCost: 0.0042, impactStatement: 'TBD' },
  'systems-interactions-map': { resourceId: 'systems-interactions-map', resourceName: 'Systems Interactions Map', tier: 8, category: 'strategic', requiredDependencies: ['service-blueprints'], optionalDependencies: [], estimatedTokens: 1500, generationCost: 0.0045, impactStatement: 'TBD' },
  'board-presentation': { resourceId: 'board-presentation', resourceName: 'Board Presentation', tier: 7, category: 'strategic', requiredDependencies: ['icp-analysis', 'value-messaging'], optionalDependencies: [], estimatedTokens: 2000, generationCost: 0.006, impactStatement: 'TBD' },
  'executive-business-case': { resourceId: 'executive-business-case', resourceName: 'Executive Business Case', tier: 7, category: 'strategic', requiredDependencies: ['icp-analysis', 'target-buyer-personas'], optionalDependencies: [], estimatedTokens: 1800, generationCost: 0.0054, impactStatement: 'TBD' },
  'ideal-investor-profile': { resourceId: 'ideal-investor-profile', resourceName: 'Ideal Investor Profile', tier: 7, category: 'strategic', requiredDependencies: ['icp-analysis', 'startup-stage'], optionalDependencies: [], estimatedTokens: 1300, generationCost: 0.0039, impactStatement: 'TBD' },
  'jobs-to-be-done': { resourceId: 'jobs-to-be-done', resourceName: 'Jobs to Be Done', tier: 7, category: 'strategic', requiredDependencies: ['target-buyer-personas', 'empathy-maps'], optionalDependencies: [], estimatedTokens: 1500, generationCost: 0.0045, impactStatement: 'TBD' },
  'roi-models': { resourceId: 'roi-models', resourceName: 'ROI Models', tier: 7, category: 'strategic', requiredDependencies: ['product-description', 'icp-analysis'], optionalDependencies: [], estimatedTokens: 1600, generationCost: 0.0048, impactStatement: 'TBD' },
  'scenario-planning': { resourceId: 'scenario-planning', resourceName: 'Scenario Planning', tier: 7, category: 'strategic', requiredDependencies: ['icp-analysis'], optionalDependencies: [], estimatedTokens: 1700, generationCost: 0.0051, impactStatement: 'TBD' },
  'series-b-readiness': { resourceId: 'series-b-readiness', resourceName: 'Series B Readiness', tier: 7, category: 'strategic', requiredDependencies: ['startup-stage', 'pmf-readiness-assessment'], optionalDependencies: [], estimatedTokens: 1500, generationCost: 0.0045, impactStatement: 'TBD' }
};

/**
 * Get resource configuration by ID
 * @param {string} resourceId - Resource identifier
 * @returns {ResourceDependency|null} Resource config or null if not found
 */
export function getResourceConfig(resourceId) {
  return RESOURCE_DEPENDENCIES[resourceId] || null;
}

/**
 * Get all resources in a specific tier
 * @param {number} tier - Tier number (0-8)
 * @returns {ResourceDependency[]} Array of resources in that tier
 */
export function getResourcesByTier(tier) {
  return Object.values(RESOURCE_DEPENDENCIES)
    .filter(resource => resource.tier === tier)
    .sort((a, b) => a.resourceName.localeCompare(b.resourceName));
}

/**
 * Get all resources in a specific category
 * @param {string} category - Category name
 * @returns {ResourceDependency[]} Array of resources in that category
 */
export function getResourcesByCategory(category) {
  return Object.values(RESOURCE_DEPENDENCIES)
    .filter(resource => resource.category === category)
    .sort((a, b) => a.tier - b.tier || a.resourceName.localeCompare(b.resourceName));
}

/**
 * Check if a resource has all required dependencies
 * @param {string} resourceId - Resource to check
 * @param {string[]} userResourceIds - Resources user has already generated
 * @returns {Object} Validation result
 */
export function validateDependencies(resourceId, userResourceIds) {
  const resource = getResourceConfig(resourceId);

  if (!resource) {
    return {
      valid: false,
      error: `Resource '${resourceId}' not found in registry`
    };
  }

  const missingRequired = resource.requiredDependencies
    .filter(depId => !userResourceIds.includes(depId));

  const missingOptional = resource.optionalDependencies
    .filter(depId => !userResourceIds.includes(depId));

  return {
    valid: missingRequired.length === 0,
    resourceId,
    resourceName: resource.resourceName,
    missingRequired,
    missingOptional,
    canProceedWithWarning: missingRequired.length === 0 && missingOptional.length > 0
  };
}

/**
 * Calculate total generation cost for a resource and its missing dependencies
 * @param {string} resourceId - Target resource
 * @param {string[]} userResourceIds - Resources user has generated
 * @returns {Object} Cost breakdown
 */
export function calculateGenerationCost(resourceId, userResourceIds) {
  const resource = getResourceConfig(resourceId);

  if (!resource) {
    return { error: `Resource '${resourceId}' not found` };
  }

  const validation = validateDependencies(resourceId, userResourceIds);

  if (!validation.valid) {
    const missingCosts = validation.missingRequired.map(depId => {
      const dep = getResourceConfig(depId);
      return {
        resourceId: depId,
        resourceName: dep?.resourceName || depId,
        cost: dep?.generationCost || 0
      };
    });

    const totalMissingCost = missingCosts.reduce((sum, dep) => sum + dep.cost, 0);

    return {
      targetResource: {
        resourceId: resource.resourceId,
        resourceName: resource.resourceName,
        cost: resource.generationCost
      },
      missingDependencies: missingCosts,
      totalCost: totalMissingCost + resource.generationCost,
      resourceCount: missingCosts.length + 1
    };
  }

  return {
    targetResource: {
      resourceId: resource.resourceId,
      resourceName: resource.resourceName,
      cost: resource.generationCost
    },
    missingDependencies: [],
    totalCost: resource.generationCost,
    resourceCount: 1
  };
}

/**
 * Get suggested generation order for missing dependencies
 * Uses topological sort to ensure dependencies are generated in correct order
 * @param {string} resourceId - Target resource
 * @param {string[]} userResourceIds - Resources user has generated
 * @returns {string[]} Ordered array of resource IDs to generate
 */
export function getSuggestedGenerationOrder(resourceId, userResourceIds) {
  const resource = getResourceConfig(resourceId);

  if (!resource) {
    return [];
  }

  const validation = validateDependencies(resourceId, userResourceIds);

  if (validation.valid) {
    return [resourceId]; // No missing dependencies, just generate target
  }

  // Build dependency graph for missing resources
  const toGenerate = new Set([...validation.missingRequired, resourceId]);
  const ordered = [];
  const visited = new Set(userResourceIds);

  /**
   * Depth-first topological sort
   */
  function visit(resId) {
    if (visited.has(resId)) return;

    const res = getResourceConfig(resId);
    if (!res) return;

    // Visit dependencies first
    for (const depId of res.requiredDependencies) {
      if (toGenerate.has(depId) && !visited.has(depId)) {
        visit(depId);
      }
    }

    visited.add(resId);
    ordered.push(resId);
  }

  // Start with missing required dependencies
  for (const depId of validation.missingRequired) {
    visit(depId);
  }

  // Then target resource
  visit(resourceId);

  return ordered;
}

export default {
  RESOURCE_DEPENDENCIES,
  getResourceConfig,
  getResourcesByTier,
  getResourcesByCategory,
  validateDependencies,
  calculateGenerationCost,
  getSuggestedGenerationOrder
};
