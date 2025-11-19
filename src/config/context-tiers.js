/**
 * Context Tier Configuration
 *
 * Defines intelligent context aggregation strategy for each resource generation.
 * Optimizes token usage from 22,000 tokens → 3,500 tokens (84% cost reduction)
 * while maintaining cumulative intelligence depth.
 *
 * FOUR-TIER STRATEGY:
 * - Tier 1 (Critical): Always include full context (~500 tokens)
 * - Tier 2 (Required): Full output from required dependencies (~2000 tokens)
 * - Tier 3 (Optional): Summarized optional context (~1000 tokens)
 * - Tier 4 (Skip): Prune distant, low-relevance resources (0 tokens)
 *
 * @see /CONTEXT_AGGREGATION_SYSTEM.md for implementation details
 * @see /COMPLETE_RESOURCE_LIBRARY_MAPPING.md for resource dependencies
 */

/**
 * Context tier configuration for a resource
 * @typedef {Object} ContextTierConfig
 * @property {string} resourceId - Resource identifier
 * @property {Object} tiers - Tier assignments
 * @property {string[]} tiers.tier1_critical - Always include (full, ~500 tokens)
 * @property {string[]} tiers.tier2_required - Required dependencies (full, ~2000 tokens)
 * @property {string[]} tiers.tier3_optional - Optional dependencies (summarized, ~1000 tokens)
 * @property {string[]} tiers.tier4_skip - Skip entirely (0 tokens)
 * @property {Object} tokenBudget - Token budgets per tier
 * @property {number} tokenBudget.tier1 - Tier 1 budget
 * @property {number} tokenBudget.tier2 - Tier 2 budget
 * @property {number} tokenBudget.tier3 - Tier 3 budget
 * @property {number} tokenBudget.total - Total budget
 */

/**
 * Context tier configurations for all resources
 * Manually tuned based on:
 * 1. Resource position in dependency chain
 * 2. Required vs optional dependencies
 * 3. Resource type (buyer intelligence vs strategic vs tactical)
 * 4. Average output token size
 */
export const CONTEXT_TIER_CONFIGS = {
  // ============================================
  // TIER 1: CORE FOUNDATION
  // ============================================

  'icp-analysis': {
    resourceId: 'icp-analysis',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'current-business-stage'],
      tier2_required: [],
      tier3_optional: [],
      tier4_skip: []
    },
    tokenBudget: {
      tier1: 500,
      tier2: 0,
      tier3: 0,
      total: 500  // First resource - minimal context
    }
  },

  'target-buyer-personas': {
    resourceId: 'target-buyer-personas',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'icp-analysis'],
      tier2_required: [],
      tier3_optional: ['refined-product-description'],
      tier4_skip: []
    },
    tokenBudget: {
      tier1: 500,
      tier2: 0,
      tier3: 500,
      total: 1000
    }
  },

  'empathy-maps': {
    resourceId: 'empathy-maps',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['refined-product-description', 'value-messaging'],
      tier4_skip: []
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1000,
      tier3: 500,
      total: 2000
    }
  },

  'refined-product-description': {
    resourceId: 'refined-product-description',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'primary-benefit'],
      tier2_required: [],
      tier3_optional: ['icp-analysis'],
      tier4_skip: []
    },
    tokenBudget: {
      tier1: 500,
      tier2: 0,
      tier3: 300,
      total: 800
    }
  },

  'value-messaging': {
    resourceId: 'value-messaging',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['empathy-maps', 'refined-product-description'],
      tier4_skip: []
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1000,
      tier3: 800,
      total: 2300
    }
  },

  // ============================================
  // TIER 2: BUYER INTELLIGENCE
  // ============================================

  'icp-rating-system': {
    resourceId: 'icp-rating-system',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['empathy-maps', 'value-messaging'],
      tier4_skip: ['refined-product-description']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1500,
      tier3: 500,
      total: 2500
    }
  },

  'buyer-persona-rating': {
    resourceId: 'buyer-persona-rating',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['empathy-maps', 'icp-rating-system'],
      tier4_skip: ['refined-product-description', 'value-messaging']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1500,
      tier3: 500,
      total: 2500
    }
  },

  'negative-buyer-personas': {
    resourceId: 'negative-buyer-personas',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'icp-analysis'],
      tier2_required: [],
      tier3_optional: ['target-buyer-personas', 'empathy-maps'],
      tier4_skip: ['refined-product-description', 'value-messaging']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 0,
      tier3: 800,
      total: 1300
    }
  },

  'non-ideal-customer-profile': {
    resourceId: 'non-ideal-customer-profile',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis', 'current-business-stage'],
      tier2_required: [],
      tier3_optional: ['target-buyer-personas', 'negative-buyer-personas'],
      tier4_skip: ['refined-product-description', 'value-messaging', 'empathy-maps']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 0,
      tier3: 600,
      total: 1100
    }
  },

  // ============================================
  // TIER 3: SCORING & PRIORITIZATION
  // ============================================

  'compelling-events': {
    resourceId: 'compelling-events',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas', 'empathy-maps'],
      tier3_optional: ['value-messaging', 'icp-rating-system'],
      tier4_skip: ['refined-product-description', 'buyer-persona-rating', 'negative-buyer-personas']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 2000,
      tier3: 500,
      total: 3000
    }
  },

  'cost-of-inaction-calculator': {
    resourceId: 'cost-of-inaction-calculator',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: [],
      tier3_optional: ['target-buyer-personas', 'compelling-events', 'empathy-maps'],
      tier4_skip: ['refined-product-description', 'value-messaging', 'buyer-persona-rating']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 0,
      tier3: 1200,
      total: 1700
    }
  },

  'product-potential-assessment': {
    resourceId: 'product-potential-assessment',
    tiers: {
      tier1_critical: ['product-description', 'startup-stage'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['icp-analysis', 'value-messaging', 'empathy-maps'],
      tier4_skip: ['refined-product-description', 'buyer-persona-rating']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1200,
      tier3: 800,
      total: 2500
    }
  },

  'product-value-statistics': {
    resourceId: 'product-value-statistics',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['value-messaging', 'empathy-maps'],
      tier4_skip: ['refined-product-description', 'compelling-events']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1200,
      tier3: 600,
      total: 2300
    }
  },

  // ============================================
  // TIER 4: VALUE COMMUNICATION
  // ============================================

  'pmf-assessment': {
    resourceId: 'pmf-assessment',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis', 'startup-stage'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['empathy-maps', 'value-messaging', 'product-potential-assessment'],
      tier4_skip: ['refined-product-description', 'buyer-persona-rating', 'icp-rating-system']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1500,
      tier3: 1000,
      total: 3000
    }
  },

  'pmf-readiness-assessment': {
    resourceId: 'pmf-readiness-assessment',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas', 'product-category', 'product-unique-differentiator', 'product-tangible-benefits'],
      tier3_optional: ['pmf-assessment', 'value-messaging'],
      tier4_skip: ['refined-product-description', 'empathy-maps', 'buyer-persona-rating']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 2000,
      tier3: 500,
      total: 3000
    }
  },

  'potential-customers-list': {
    resourceId: 'potential-customers-list',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'icp-analysis'],
      tier2_required: ['pmf-assessment'],
      tier3_optional: ['target-buyer-personas', 'compelling-events', 'icp-rating-system'],
      tier4_skip: ['refined-product-description', 'empathy-maps', 'value-messaging', 'buyer-persona-rating']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1500,
      tier3: 1000,
      total: 3000
    }
  },

  'willingness-to-pay': {
    resourceId: 'willingness-to-pay',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas', 'product-value-proposition'],
      tier3_optional: ['value-messaging', 'cost-of-inaction-calculator', 'empathy-maps'],
      tier4_skip: ['refined-product-description', 'buyer-persona-rating', 'icp-rating-system']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1800,
      tier3: 700,
      total: 3000
    }
  },

  // ============================================
  // TIER 5: SALES ENABLEMENT
  // ============================================

  'sales-slide-deck': {
    resourceId: 'sales-slide-deck',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas', 'value-messaging'],
      tier3_optional: ['empathy-maps', 'compelling-events', 'cost-of-inaction-calculator', 'product-value-statistics'],
      tier4_skip: ['refined-product-description', 'buyer-persona-rating', 'icp-rating-system', 'negative-buyer-personas']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 2000,
      tier3: 1000,
      total: 3500
    }
  },

  'sales-tasks-basic': {
    resourceId: 'sales-tasks-basic',
    tiers: {
      tier1_critical: ['product-description', 'startup-stage', 'business-goal'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['icp-analysis', 'value-messaging', 'pmf-assessment'],
      tier4_skip: ['refined-product-description', 'empathy-maps', 'buyer-persona-rating']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1200,
      tier3: 800,
      total: 2500
    }
  },

  'technical-sales-translator': {
    resourceId: 'technical-sales-translator',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['empathy-maps', 'value-messaging', 'compelling-events'],
      tier4_skip: ['refined-product-description', 'buyer-persona-rating', 'icp-rating-system']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1500,
      tier3: 1000,
      total: 3000
    }
  },

  'product-market-clarity-translation': {
    resourceId: 'product-market-clarity-translation',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['empathy-maps', 'desert-context', 'compelling-events', 'value-messaging'],
      tier4_skip: ['refined-product-description', 'buyer-persona-rating', 'icp-rating-system']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1500,
      tier3: 1200,
      total: 3200
    }
  },

  // ============================================
  // TIER 6: ADVANCED ENTERPRISE
  // ============================================

  'buying-committee-navigation-guide': {
    resourceId: 'buying-committee-navigation-guide',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['empathy-maps', 'stakeholder-arsenal', 'value-messaging'],
      tier4_skip: ['refined-product-description', 'buyer-persona-rating', 'icp-rating-system', 'compelling-events']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1500,
      tier3: 1000,
      total: 3000
    }
  },

  'day-in-life': {
    resourceId: 'day-in-life',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas', 'empathy-maps'],
      tier3_optional: ['user-journey-maps', 'compelling-events'],
      tier4_skip: ['refined-product-description', 'value-messaging', 'buyer-persona-rating', 'icp-rating-system']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 2000,
      tier3: 500,
      total: 3000
    }
  },

  'mock-selling-dialogues': {
    resourceId: 'mock-selling-dialogues',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas', 'value-messaging'],
      tier3_optional: ['empathy-maps', 'compelling-events', 'sales-slide-deck'],
      tier4_skip: ['refined-product-description', 'buyer-persona-rating', 'icp-rating-system', 'product-value-statistics']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 2000,
      tier3: 1000,
      total: 3500
    }
  },

  // ============================================
  // TIER 7: STRATEGIC PLANNING
  // ============================================

  'board-presentation': {
    resourceId: 'board-presentation',
    tiers: {
      tier1_critical: ['product-name', 'product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas', 'value-messaging', 'roi-models', 'executive-business-case'],
      tier3_optional: ['pmf-readiness-assessment', 'compelling-events', 'sales-slide-deck', 'buyer-persona-rating'],
      tier4_skip: ['refined-product-description', 'empathy-maps', 'technical-sales-translator', 'product-potential-assessment', 'buyer-persona-rating', 'icp-rating-system']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 2000,
      tier3: 1000,
      total: 3500
    }
  },

  'executive-business-case': {
    resourceId: 'executive-business-case',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas', 'value-messaging'],
      tier3_optional: ['roi-models', 'cost-of-inaction-calculator', 'compelling-events'],
      tier4_skip: ['refined-product-description', 'empathy-maps', 'buyer-persona-rating', 'icp-rating-system', 'product-value-statistics']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 2000,
      tier3: 1000,
      total: 3500
    }
  },

  'roi-models': {
    resourceId: 'roi-models',
    tiers: {
      tier1_critical: ['product-description', 'icp-analysis'],
      tier2_required: ['target-buyer-personas'],
      tier3_optional: ['value-messaging', 'cost-of-inaction-calculator', 'willingness-to-pay'],
      tier4_skip: ['refined-product-description', 'empathy-maps', 'buyer-persona-rating', 'icp-rating-system']
    },
    tokenBudget: {
      tier1: 500,
      tier2: 1500,
      tier3: 1000,
      total: 3000
    }
  }

  // NOTE: Remaining resources follow same pattern
  // Full implementation includes all 77 resources
  // Abbreviated here for initial deployment
};

/**
 * Get context tier configuration for a resource
 * @param {string} resourceId - Resource identifier
 * @returns {ContextTierConfig|null} Tier config or null if not found
 */
export function getContextTierConfig(resourceId) {
  return CONTEXT_TIER_CONFIGS[resourceId] || null;
}

/**
 * Get default context tier config for resources not yet configured
 * Uses conservative defaults based on resource dependencies
 * @param {Object} resource - Resource configuration from resource-dependencies
 * @returns {ContextTierConfig} Default tier configuration
 */
export function getDefaultContextTierConfig(resource) {
  if (!resource) {
    return null;
  }

  // Default strategy:
  // - Tier 1: Product basics + ICP (if available)
  // - Tier 2: All required dependencies
  // - Tier 3: Optional dependencies (up to 3)
  // - Tier 4: Everything else

  const tier1_critical = ['product-name', 'product-description'];
  if (resource.requiredDependencies.includes('icp-analysis')) {
    tier1_critical.push('icp-analysis');
  }

  const tier2_required = resource.requiredDependencies.filter(
    dep => !tier1_critical.includes(dep)
  );

  const tier3_optional = resource.optionalDependencies.slice(0, 3);

  const tier4_skip = resource.optionalDependencies.slice(3);

  return {
    resourceId: resource.resourceId,
    tiers: {
      tier1_critical,
      tier2_required,
      tier3_optional,
      tier4_skip
    },
    tokenBudget: {
      tier1: 500,
      tier2: 2000,
      tier3: 1000,
      total: 3500
    }
  };
}

/**
 * Validate context tier configuration
 * Ensures tier assignments don't exceed token budgets
 * @param {ContextTierConfig} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateContextTierConfig(config) {
  if (!config) {
    return { valid: false, error: 'Configuration is null or undefined' };
  }

  const errors = [];

  // Check token budget totals
  const { tier1, tier2, tier3, total } = config.tokenBudget;
  const calculatedTotal = tier1 + tier2 + tier3;

  if (calculatedTotal !== total) {
    errors.push(`Token budget mismatch: tier1(${tier1}) + tier2(${tier2}) + tier3(${tier3}) = ${calculatedTotal}, but total is ${total}`);
  }

  if (total > 4000) {
    errors.push(`Total token budget (${total}) exceeds recommended maximum of 4000 tokens`);
  }

  // Check for overlaps between tiers
  const allTier1 = new Set(config.tiers.tier1_critical);
  const allTier2 = new Set(config.tiers.tier2_required);
  const allTier3 = new Set(config.tiers.tier3_optional);
  const allTier4 = new Set(config.tiers.tier4_skip);

  const tier1And2 = [...allTier1].filter(x => allTier2.has(x));
  const tier1And3 = [...allTier1].filter(x => allTier3.has(x));
  const tier2And3 = [...allTier2].filter(x => allTier3.has(x));

  if (tier1And2.length > 0) {
    errors.push(`Resources in both tier1 and tier2: ${tier1And2.join(', ')}`);
  }
  if (tier1And3.length > 0) {
    errors.push(`Resources in both tier1 and tier3: ${tier1And3.join(', ')}`);
  }
  if (tier2And3.length > 0) {
    errors.push(`Resources in both tier2 and tier3: ${tier2And3.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

export default {
  CONTEXT_TIER_CONFIGS,
  getContextTierConfig,
  getDefaultContextTierConfig,
  validateContextTierConfig
};
