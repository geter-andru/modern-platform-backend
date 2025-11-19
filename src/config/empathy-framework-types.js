/**
 * Empathy Framework Type Definitions
 *
 * Four-Layer Framework for Emotional Resonance in GTM Content
 *
 * Naming Standards:
 * - "Core Worry" (not "3 AM Fear") - The deep emotional concern/anxiety
 * - "Critical Need Context" (not "Desert Context") - Urgency/survival timeline
 */

/**
 * Empathy Map Structure
 * Maps buyer persona to emotional drivers and hidden motivations
 */
export const EmpathyMapStructure = {
  see: ['string'],                      // Observable external reality
  hear: ['string'],                     // Direct feedback from board/team/customers
  thinkAndFeel: ['string'],             // Core worries, hidden concerns, emotional pressures
  sayAndDo: {
    public: ['string'],                 // Public statements/behavior
    private: ['string']                 // Private behavior/actions (what they do but don't say)
  },
  pains: ['string'],                    // Professional risks, emotional burdens
  gains: ['string']                     // Professional relief, career advancement
};

/**
 * Critical Need Context Structure
 * Captures urgency, survival timeline, and critical success metrics
 */
export const CriticalNeedContextStructure = {
  runwayMonths: 'number',               // Months of runway remaining (e.g., 14)
  fundingPressure: 'string',            // Funding urgency (e.g., "Series A required in 90 days")
  boardMilestones: ['string'],          // Board-mandated goals (e.g., ["5-10 enterprise logos", "$5M ARR"])
  recentHires: ['string'],              // Recent key hires (e.g., ["VP Enterprise Sales hired 8 months ago"])
  observablePainSignals: ['string'],    // Visible pain points (e.g., ["Losing deals at CFO stage"])
  criticalSuccessMetrics: [
    {
      metric: 'string',                 // What must be achieved (e.g., "Close 3-5 enterprise deals")
      deadline: 'string',               // When it must happen (e.g., "90 days")
      impact: 'string'                  // What it enables (e.g., "Extends runway 6-9 months")
    }
  ]
};

/**
 * Four-Layer Translation Framework
 *
 * Layer 1: Technical Capability (what it does)
 * Layer 2: Strategic Pain/Risk (connects to Core Worry)
 * Layer 3: Strategic Outcome (transformation achieved)
 * Layer 4: ROI + Relief (numbers + emotional relief + career win)
 */
export const FourLayerFrameworkStructure = {
  layer1_technicalCapability: 'string',           // Factual capability (same for all personas)

  layer2_strategicPainRisk: {
    externalPressure: 'string',                   // Market/board/competitive reality
    coreWorry: 'string',                          // Internal emotional driver (Core Worry)
    theRisk: 'string'                             // Failure consequences
  },

  layer3_strategicOutcome: {
    operationalChange: 'string',                  // How day-to-day transforms
    strategicChange: 'string',                    // How position/capability improves
    relationshipChange: 'string'                  // How stakeholder perception shifts
  },

  layer4_roiAndRelief: {
    theNumbers: {
      primary: 'string',                          // Defensible to their stakeholder
      secondary: 'string',                        // Supporting calculation
      timeToValue: 'string',                      // When they see results
      defensibleTo: 'string'                      // "Board" | "Founder" | "CFO"
    },
    theRelief: 'string',                          // Emotional relief statement (first-person)
    theCareerWin: 'string'                        // Professional advancement outcome
  }
};

/**
 * Empathy-Enhanced Resource Schema Extension
 *
 * Add these fields to ANY resource that should have empathy alignment
 */
export const EmpathyEnhancementFields = {
  // Overall empathy alignment for the resource
  empathyAlignment: {
    coreWorryAddressed: 'string',                 // Which Core Worry this resource addresses
    reliefProvided: 'string',                     // Emotional relief this resource provides
    careerWinArticulated: 'string',               // Career advancement this enables
    criticalNeedAlignment: {
      deadline: 'string',                         // How this ties to critical deadline
      survivalImpact: 'string'                    // How this affects runway/funding/survival
    }
  },

  // Per-section empathy connection (for multi-section resources)
  sectionEmpathyMap: [
    {
      sectionId: 'string',                        // Which section (e.g., "slide-3", "email-2")
      targetCoreWorry: 'string',                  // Which Core Worry this section addresses
      reliefStatement: 'string',                  // Emotional relief this section provides
      urgencyFraming: 'string'                    // How this ties to Critical Need Context
    }
  ]
};

/**
 * Helper Functions for Empathy Context Extraction
 */

/**
 * Extract Core Worry from empathy map
 * @param {Object} empathyMap - Empathy map object
 * @returns {string} Primary Core Worry
 */
export function extractCoreWorry(empathyMap) {
  if (!empathyMap || !empathyMap.thinkAndFeel || empathyMap.thinkAndFeel.length === 0) {
    return null;
  }

  // Primary Core Worry is the first "thinkAndFeel" entry
  return empathyMap.thinkAndFeel[0];
}

/**
 * Extract all emotional pains from empathy map
 * @param {Object} empathyMap - Empathy map object
 * @returns {Array<string>} All emotional pains
 */
export function extractEmotionalPains(empathyMap) {
  if (!empathyMap || !empathyMap.pains) {
    return [];
  }

  return empathyMap.pains;
}

/**
 * Extract desired gains from empathy map
 * @param {Object} empathyMap - Empathy map object
 * @returns {Array<string>} All desired gains
 */
export function extractDesiredGains(empathyMap) {
  if (!empathyMap || !empathyMap.gains) {
    return [];
  }

  return empathyMap.gains;
}

/**
 * Format empathy context for AI prompt
 * @param {Object} empathyMap - Empathy map object
 * @param {Array<string>} hiddenAmbitions - Hidden career ambitions
 * @param {Array<string>} failureConsequences - Consequences of failure
 * @returns {string} Formatted empathy context
 */
export function formatEmpathyContext(empathyMap, hiddenAmbitions, failureConsequences) {
  const coreWorry = extractCoreWorry(empathyMap);

  if (!coreWorry) {
    return null;
  }

  return {
    coreWorry,
    hiddenAmbition: hiddenAmbitions?.[0] || null,
    failureConsequence: failureConsequences?.[0] || null,
    emotionalPains: extractEmotionalPains(empathyMap),
    desiredGains: extractDesiredGains(empathyMap)
  };
}

/**
 * Format Critical Need Context for AI prompt
 * @param {Object} criticalNeedContext - Critical need context object
 * @returns {string} Formatted context
 */
export function formatCriticalNeedContext(criticalNeedContext) {
  if (!criticalNeedContext) {
    return null;
  }

  return {
    urgency: {
      runway: `${criticalNeedContext.runwayMonths} months`,
      fundingPressure: criticalNeedContext.fundingPressure
    },
    criticalDeadline: criticalNeedContext.criticalSuccessMetrics?.[0]?.deadline || null,
    criticalMetric: criticalNeedContext.criticalSuccessMetrics?.[0]?.metric || null,
    survivalImpact: criticalNeedContext.criticalSuccessMetrics?.[0]?.impact || null
  };
}

/**
 * Validate empathy alignment in generated content
 * @param {Object} content - Generated resource content
 * @param {Object} empathyContext - Original empathy context
 * @returns {Object} Validation result
 */
export function validateEmpathyAlignment(content, empathyContext) {
  const errors = [];

  // Check if empathyAlignment section exists
  if (!content.empathyAlignment) {
    errors.push('Missing empathyAlignment section');
  } else {
    // Validate core fields
    if (!content.empathyAlignment.coreWorryAddressed) {
      errors.push('Missing coreWorryAddressed in empathyAlignment');
    }

    if (!content.empathyAlignment.reliefProvided) {
      errors.push('Missing reliefProvided in empathyAlignment');
    }

    // Validate Critical Need alignment if context exists
    if (empathyContext.criticalNeedContext && !content.empathyAlignment.criticalNeedAlignment) {
      errors.push('Missing criticalNeedAlignment when Critical Need Context provided');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    alignment: content.empathyAlignment || null
  };
}

/**
 * Example Empathy-Enhanced Resource
 *
 * This shows how any resource should structure its empathy fields
 */
export const ExampleEmpathyEnhancedResource = {
  resourceId: 'sales-slide-deck',
  resourceName: 'Sales Slide Deck',

  // Regular content
  slides: [
    {
      slideNumber: 1,
      slideTitle: 'The Reality',
      content: '...',

      // Empathy connection for this slide
      empathyConnection: {
        targetCoreWorry: 'I\'m terrified I\'ll have to lay off my team because we can\'t close enterprise deals',
        capabilityGap: 'Can\'t translate technical superiority into CFO-friendly ROI language',
        reliefStatement: 'I stop waking up at 3 AM worried about team layoffs',
        urgencyFraming: 'With 90 days to Series A and 14 months runway, every enterprise win extends survival 2-3 months'
      }
    }
  ],

  // Overall empathy alignment
  empathyAlignment: {
    coreWorryAddressed: 'I\'m terrified I\'ll have to lay off my team and face board replacement',
    capabilityGapIdentified: 'Can\'t translate technical superiority into CFO-friendly language that closes enterprise deals',
    reliefProvided: 'I stop waking up at 3 AM worried about team layoffs and board replacement',
    careerWinArticulated: 'Prove technical founders can scale category-defining companies and secure Series A on strength',
    criticalNeedAlignment: {
      deadline: '90 days to Series A, 14 months runway',
      survivalImpact: 'Each enterprise win extends runway 2-3 months + hits board milestones, preventing the nightmare scenario'
    }
  }
};

/**
 * Glossary of Terms
 */
export const EmpathyFrameworkGlossary = {
  'Core Worry': 'The CONSEQUENCE they fear, NOT the capability gap. What keeps them up at 3 AM is "team layoffs", "board replacement", "company failure" - NOT "I can\'t translate technical to CFO language." The capability gap is what\'s BLOCKING relief from the Core Worry. Found in empathyMap.thinkAndFeel. Examples: "I\'m terrified I\'ll have to lay off my team", "I fear the board will replace me", "I\'m afraid the company will fail and it will be my fault."',

  'Critical Need Context': 'The urgency framework that captures survival timeline, funding pressure, board mandates, and critical success metrics. Replaces "Desert Context" terminology. Provides deadline-driven context for why this matters NOW. This amplifies the Core Worry by adding time pressure.',

  'Hidden Ambition': 'Career goals or professional aspirations not publicly stated. What someone privately wants to achieve or prove (e.g., "Prove technical founders can scale companies"). This is what they want to achieve BEYOND just avoiding the Core Worry.',

  'Failure Consequence': 'What actually happens if they don\'t succeed. Not generic "missed quota" but real consequences like "team layoffs", "board replacement", "company shutdown". This is often identical to or closely related to the Core Worry - the nightmare scenario they\'re trying to avoid.',

  'Emotional Relief': 'First-person statement of what burden is lifted. Always starts with "I stop..." and addresses the Core Worry directly (e.g., "I stop waking up terrified about team layoffs", NOT "I stop struggling to translate technical language"). The relief removes the CONSEQUENCE fear, not just the capability gap.',

  'Career Win': 'Professional advancement outcome beyond company metrics. How this success changes their career trajectory or professional identity. What they achieve AFTER the Core Worry is resolved.',

  'Capability Gap': 'IMPORTANT DISTINCTION: This is what\'s CAUSING the Core Worry, not the Core Worry itself. Example: "Can\'t translate technical superiority into CFO language" is the GAP. "Terrified about team layoffs" is the Core Worry. We address the gap to relieve the worry.',

  'Four-Layer Framework': 'Complete emotional + rational value articulation: (1) Technical capability, (2) Strategic pain/risk with Core Worry (the CONSEQUENCE, not the gap), (3) Strategic outcome transformation, (4) ROI + Relief (removes Core Worry consequence) + Career Win.'
};

export default {
  EmpathyMapStructure,
  CriticalNeedContextStructure,
  FourLayerFrameworkStructure,
  EmpathyEnhancementFields,
  ExampleEmpathyEnhancedResource,
  EmpathyFrameworkGlossary,

  // Helper functions
  extractCoreWorry,
  extractEmotionalPains,
  extractDesiredGains,
  formatEmpathyContext,
  formatCriticalNeedContext,
  validateEmpathyAlignment
};
