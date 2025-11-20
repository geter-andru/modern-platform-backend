/**
 * Resource Assets Mapping
 *
 * Maps 38 user-facing Strategic Assets to 46 backend prompts
 * Preserves cumulative intelligence dependency chains
 *
 * Structure:
 * - 38 Strategic Assets (user-facing)
 * - 46 Strategic Prompts (backend files)
 * - 52 Implementation Resources (tactical guides)
 * - Total: 98 prompts generating 38 asset bundles
 */

import { RESOURCE_DEPENDENCIES } from './resource-dependencies.js';

/**
 * Asset Configuration
 * Each asset represents a bundle that users see and unlock
 */
export const STRATEGIC_ASSETS = {
  // ============================================
  // FOUNDATION TIER (14 Assets)
  // ============================================

  'asset-1-icp-analysis': {
    id: 'asset-1-icp-analysis',
    assetNumber: 1,
    title: 'ICP Analysis Framework',
    description: 'Define your ideal customer with surgical precision, eliminating wasted sales effort on bad-fit prospects.',
    category: 'buyer_intelligence',
    tier: 'foundation',

    // Strategic prompts (what generates the core framework)
    strategicPrompts: ['icp-analysis'],

    // Implementation guides (tactical next-steps)
    implementationResources: [
      'icp-crm-qualification-checklist',
      'icp-customer-validation',
      'icp-rating-calibration'
    ],

    // Unlock criteria
    unlockThreshold: {
      milestone: 'sub_9_1',
      progress: 25
    },

    // Cumulative intelligence (inherited from dependencies)
    dependencies: RESOURCE_DEPENDENCIES['icp-analysis'],

    // Generation metadata
    estimatedGenerationTime: '12 minutes',
    consultingEquivalent: '$8,000-12,000'
  },

  'asset-2-buyer-personas': {
    id: 'asset-2-buyer-personas',
    assetNumber: 2,
    title: 'Target Buyer Personas',
    description: 'Detailed profiles of decision makers, influencers, and end users with empathy mapping.',
    category: 'buyer_intelligence',
    tier: 'foundation',

    strategicPrompts: ['target-buyer-personas'],
    implementationResources: [
      'persona-sales-messaging',
      'buyer-persona-rating-training',
      'empathy-discovery-script'
    ],

    unlockThreshold: {
      milestone: 'sub_9_1',
      progress: 50
    },

    dependencies: RESOURCE_DEPENDENCIES['target-buyer-personas'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$10,000-15,000'
  },

  'asset-3-empathy-maps': {
    id: 'asset-3-empathy-maps',
    assetNumber: 3,
    title: 'Empathy Maps',
    description: 'Visual representation of what customers think, feel, see, say, and do.',
    category: 'buyer_intelligence',
    tier: 'foundation',

    strategicPrompts: ['empathy-maps'],
    implementationResources: [
      'content-strategy-from-empathy',
      'discovery-questions-update'
    ],

    unlockThreshold: {
      milestone: 'sub_9_1',
      progress: 75
    },

    dependencies: RESOURCE_DEPENDENCIES['empathy-maps'],

    estimatedGenerationTime: '12 minutes',
    consultingEquivalent: '$8,000-10,000'
  },

  'asset-4-icp-rating-system': {
    id: 'asset-4-icp-rating-system',
    assetNumber: 4,
    title: 'ICP Rating System',
    description: 'Score and prioritize prospects based on ideal customer fit.',
    category: 'scoring_systems',
    tier: 'foundation',

    strategicPrompts: ['icp-rating-system'],
    implementationResources: [
      'icp-crm-implementation',
      'icp-calibration-with-customers'
    ],

    unlockThreshold: {
      milestone: 'sub_9_1',
      progress: 100
    },

    dependencies: RESOURCE_DEPENDENCIES['icp-rating-system'],

    estimatedGenerationTime: '10 minutes',
    consultingEquivalent: '$6,000-8,000'
  },

  'asset-5-buyer-persona-rating': {
    id: 'asset-5-buyer-persona-rating',
    assetNumber: 5,
    title: 'Buyer Persona Rating System',
    description: 'Score individual contacts on persona alignment for focused outreach.',
    category: 'scoring_systems',
    tier: 'foundation',

    strategicPrompts: ['buyer-persona-rating'],
    implementationResources: [
      'contact-scoring-workflow',
      'sales-team-rating-training'
    ],

    unlockThreshold: {
      milestone: 'sub_9_2',
      progress: 25
    },

    dependencies: RESOURCE_DEPENDENCIES['buyer-persona-rating'],

    estimatedGenerationTime: '10 minutes',
    consultingEquivalent: '$6,000-8,000'
  },

  'asset-6-negative-personas': {
    id: 'asset-6-negative-personas',
    assetNumber: 6,
    title: 'Negative Buyer Personas',
    description: 'Identify bad-fit buyers to avoid wasted cycles on prospects who will never close.',
    category: 'buyer_intelligence',
    tier: 'foundation',

    // COMBINED: 2 prompts → 1 asset
    strategicPrompts: ['negative-buyer-personas', 'non-ideal-customer-profile'],
    implementationResources: [
      'crm-disqualification-rules',
      'red-flag-checklist'
    ],

    unlockThreshold: {
      milestone: 'sub_9_2',
      progress: 50
    },

    // Combined dependencies from both prompts
    dependencies: {
      ...RESOURCE_DEPENDENCIES['negative-buyer-personas'],
      relatedPrompts: ['negative-buyer-personas', 'non-ideal-customer-profile']
    },

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$8,000-12,000'
  },

  'asset-7-pmf-assessment': {
    id: 'asset-7-pmf-assessment',
    assetNumber: 7,
    title: 'Product-Market Fit Assessment',
    description: 'Comprehensive PMF evaluation with actionable gaps and improvement roadmap.',
    category: 'market_validation',
    tier: 'foundation',

    // COMBINED: 2 prompts → 1 asset
    strategicPrompts: ['pmf-assessment', 'pmf-readiness-assessment'],
    implementationResources: [
      'pmf-action-plan-prioritization',
      'pmf-quarterly-review-cadence'
    ],

    unlockThreshold: {
      milestone: 'sub_9_2',
      progress: 75
    },

    dependencies: {
      ...RESOURCE_DEPENDENCIES['pmf-assessment'],
      relatedPrompts: ['pmf-assessment', 'pmf-readiness-assessment']
    },

    estimatedGenerationTime: '18 minutes',
    consultingEquivalent: '$12,000-18,000'
  },

  'asset-8-product-potential': {
    id: 'asset-8-product-potential',
    assetNumber: 8,
    title: 'Product Potential Assessment',
    description: 'Identify your unique differentiator, tangible benefits, and competitive positioning.',
    category: 'market_validation',
    tier: 'foundation',

    strategicPrompts: ['product-potential-assessment'],
    implementationResources: [
      'competitive-positioning-refinement',
      'roi-calculator-creation'
    ],

    unlockThreshold: {
      milestone: 'sub_9_2',
      progress: 100
    },

    dependencies: RESOURCE_DEPENDENCIES['product-potential-assessment'],

    estimatedGenerationTime: '12 minutes',
    consultingEquivalent: '$8,000-10,000'
  },

  'asset-9-refined-product-description': {
    id: 'asset-9-refined-product-description',
    assetNumber: 9,
    title: 'Refined Product Description',
    description: 'Translate technical jargon into clear business language enterprise buyers understand.',
    category: 'value_communication',
    tier: 'foundation',

    strategicPrompts: ['refined-product-description'],
    implementationResources: [
      'website-copy-update',
      'one-pager-sales-deck'
    ],

    unlockThreshold: {
      milestone: 'sub_9_3',
      progress: 25
    },

    dependencies: RESOURCE_DEPENDENCIES['refined-product-description'],

    estimatedGenerationTime: '10 minutes',
    consultingEquivalent: '$6,000-8,000'
  },

  'asset-10-technical-translator': {
    id: 'asset-10-technical-translator',
    assetNumber: 10,
    title: 'Technical Sales Translator',
    description: 'Convert technical features into business outcomes that buyers actually care about.',
    category: 'value_communication',
    tier: 'foundation',

    strategicPrompts: ['technical-sales-translator'],
    implementationResources: [
      'statistics-enhanced-sales-materials',
      'value-messaging-templates',
      'persona-based-messaging'
    ],

    unlockThreshold: {
      milestone: 'sub_9_3',
      progress: 50
    },

    dependencies: RESOURCE_DEPENDENCIES['technical-sales-translator'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$10,000-12,000'
  },

  'asset-11-value-messaging': {
    id: 'asset-11-value-messaging',
    assetNumber: 11,
    title: 'Value Messaging System',
    description: 'Persona-aligned value propositions, SEO keywords, and outreach templates.',
    category: 'value_communication',
    tier: 'foundation',

    strategicPrompts: ['value-messaging'],
    implementationResources: [
      'ab-test-email-templates',
      'seo-content-strategy'
    ],

    unlockThreshold: {
      milestone: 'sub_9_3',
      progress: 75
    },

    dependencies: RESOURCE_DEPENDENCIES['value-messaging'],

    estimatedGenerationTime: '12 minutes',
    consultingEquivalent: '$8,000-10,000'
  },

  'asset-12-cost-of-inaction': {
    id: 'asset-12-cost-of-inaction',
    assetNumber: 12,
    title: 'Cost of Inaction Calculator',
    description: 'Quantify financial and competitive risks of delayed action to create urgency.',
    category: 'financial_justification',
    tier: 'foundation',

    strategicPrompts: ['cost-of-inaction-calculator'],
    implementationResources: [
      'personalized-one-pagers',
      'urgency-email-sequence'
    ],

    unlockThreshold: {
      milestone: 'sub_9_3',
      progress: 100
    },

    dependencies: RESOURCE_DEPENDENCIES['cost-of-inaction-calculator'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$10,000-15,000'
  },

  'asset-13-compelling-events': {
    id: 'asset-13-compelling-events',
    assetNumber: 13,
    title: 'Compelling Events Identifier',
    description: 'Identify specific triggers that make buyers urgently seek your solution right now.',
    category: 'sales_enablement',
    tier: 'foundation',

    strategicPrompts: ['compelling-events'],
    implementationResources: [
      'trigger-based-prospecting-system',
      'event-specific-landing-pages'
    ],

    // Also includes potential-customers-list as supporting resource
    relatedPrompts: ['potential-customers-list'],

    unlockThreshold: {
      milestone: 'sub_10_1',
      progress: 25
    },

    dependencies: RESOURCE_DEPENDENCIES['compelling-events'],

    estimatedGenerationTime: '12 minutes',
    consultingEquivalent: '$8,000-12,000'
  },

  'asset-14-sales-slide-deck': {
    id: 'asset-14-sales-slide-deck',
    assetNumber: 14,
    title: 'Sales Slide Deck Generator',
    description: 'Professional sales deck with value propositions, use cases, and ROI proof points.',
    category: 'sales_enablement',
    tier: 'foundation',

    strategicPrompts: ['sales-slide-deck'],
    implementationResources: [
      'demo-script-from-deck',
      'deck-customization-guide'
    ],

    // Also includes product-value-statistics
    relatedPrompts: ['product-value-statistics'],

    unlockThreshold: {
      milestone: 'sub_10_1',
      progress: 50
    },

    dependencies: RESOURCE_DEPENDENCIES['sales-slide-deck'],

    estimatedGenerationTime: '18 minutes',
    consultingEquivalent: '$12,000-18,000'
  },

  // ============================================
  // GROWTH TIER (+14 Assets, 28 Total)
  // ============================================

  'asset-15-buying-committee': {
    id: 'asset-15-buying-committee',
    assetNumber: 15,
    title: 'Buying Committee Navigation Guide',
    description: 'Navigate complex B2B buying committees with stakeholder-specific strategies.',
    category: 'enterprise_sales',
    tier: 'growth',

    strategicPrompts: ['buying-committee-navigation-guide'],
    implementationResources: [
      'stakeholder-specific-sales-plays',
      'feature-to-kpi-matrix'
    ],

    unlockThreshold: {
      milestone: 'sub_10_1',
      progress: 75
    },

    dependencies: RESOURCE_DEPENDENCIES['buying-committee-navigation-guide'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$12,000-18,000'
  },

  'asset-16-stakeholder-arsenal': {
    id: 'asset-16-stakeholder-arsenal',
    assetNumber: 16,
    title: 'Stakeholder Arsenal',
    description: 'Engagement playbooks for each committee member with journey stage strategies.',
    category: 'enterprise_sales',
    tier: 'growth',

    strategicPrompts: ['stakeholder-arsenal'],
    implementationResources: [
      'engagement-playbooks-per-stakeholder',
      'journey-stage-playbooks'
    ],

    unlockThreshold: {
      milestone: 'sub_10_1',
      progress: 100
    },

    dependencies: RESOURCE_DEPENDENCIES['stakeholder-arsenal'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$12,000-15,000'
  },

  'asset-17-mock-dialogues': {
    id: 'asset-17-mock-dialogues',
    assetNumber: 17,
    title: 'Mock Selling Dialogues',
    description: 'Realistic sales conversations with objection handling and discovery techniques.',
    category: 'sales_enablement',
    tier: 'growth',

    strategicPrompts: ['mock-selling-dialogues'],
    implementationResources: [
      'call-analysis-framework',
      'objection-handling-practice'
    ],

    unlockThreshold: {
      milestone: 'sub_10_2',
      progress: 25
    },

    dependencies: RESOURCE_DEPENDENCIES['mock-selling-dialogues'],

    estimatedGenerationTime: '20 minutes',
    consultingEquivalent: '$15,000-20,000'
  },

  'asset-18-discovery-framework': {
    id: 'asset-18-discovery-framework',
    assetNumber: 18,
    title: 'Discovery Call Framework',
    description: 'Structured discovery process with question banks and qualification criteria.',
    category: 'sales_enablement',
    tier: 'growth',

    // Derived from mock-selling-dialogues
    strategicPrompts: ['mock-selling-dialogues'],
    implementationResources: [
      'discovery-call-script',
      'question-bank',
      'recording-analysis-guide'
    ],

    unlockThreshold: {
      milestone: 'sub_10_2',
      progress: 50
    },

    dependencies: RESOURCE_DEPENDENCIES['mock-selling-dialogues'],

    estimatedGenerationTime: '12 minutes',
    consultingEquivalent: '$8,000-12,000'
  },

  'asset-19-day-in-life': {
    id: 'asset-19-day-in-life',
    assetNumber: 19,
    title: 'Day-in-Life Scenarios',
    description: 'Detailed customer usage scenarios showing moments of satisfaction and pain.',
    category: 'customer_understanding',
    tier: 'growth',

    strategicPrompts: ['day-in-life'],
    implementationResources: [
      'usage-session-analysis',
      'demo-script-from-scenario'
    ],

    unlockThreshold: {
      milestone: 'sub_10_2',
      progress: 75
    },

    dependencies: RESOURCE_DEPENDENCIES['day-in-life'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$10,000-15,000'
  },

  'asset-20-month-in-life': {
    id: 'asset-20-month-in-life',
    assetNumber: 20,
    title: 'Month-in-Life Analysis',
    description: 'Long-term customer usage patterns and recurring value moments.',
    category: 'customer_understanding',
    tier: 'growth',

    strategicPrompts: ['month-in-life'],
    implementationResources: [
      'long-term-usage-patterns',
      'onboarding-sequence-design'
    ],

    unlockThreshold: {
      milestone: 'sub_10_2',
      progress: 100
    },

    dependencies: RESOURCE_DEPENDENCIES['month-in-life'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$10,000-15,000'
  },

  'asset-21-user-journey-maps': {
    id: 'asset-21-user-journey-maps',
    assetNumber: 21,
    title: 'User Journey Maps',
    description: 'Visual journey from awareness to advocacy with touchpoint optimization.',
    category: 'customer_understanding',
    tier: 'growth',

    strategicPrompts: ['user-journey-maps'],
    implementationResources: [
      'touchpoint-gap-analysis',
      'stage-specific-content-creation'
    ],

    unlockThreshold: {
      milestone: 'sub_10_3',
      progress: 25
    },

    dependencies: RESOURCE_DEPENDENCIES['user-journey-maps'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$12,000-15,000'
  },

  'asset-22-buyer-ux': {
    id: 'asset-22-buyer-ux',
    assetNumber: 22,
    title: 'Buyer UX Considerations',
    description: 'UX optimization strategies aligned with buyer psychology and adoption drivers.',
    category: 'product_optimization',
    tier: 'growth',

    strategicPrompts: ['buyer-ux-considerations'],
    implementationResources: [
      'ux-prioritization-matrix',
      'usability-testing-plan'
    ],

    unlockThreshold: {
      milestone: 'sub_10_3',
      progress: 50
    },

    dependencies: RESOURCE_DEPENDENCIES['buyer-ux-considerations'],

    estimatedGenerationTime: '12 minutes',
    consultingEquivalent: '$8,000-12,000'
  },

  'asset-23-ideal-head-of-sales': {
    id: 'asset-23-ideal-head-of-sales',
    assetNumber: 23,
    title: 'Ideal Head of Sales Profile',
    description: 'Complete hiring profile with interview questions and onboarding plan.',
    category: 'team_building',
    tier: 'growth',

    strategicPrompts: ['ideal-head-of-sales'],
    implementationResources: [
      'job-description-template',
      'interview-questions-guide',
      'onboarding-plan'
    ],

    unlockThreshold: {
      milestone: 'sub_10_3',
      progress: 75
    },

    dependencies: RESOURCE_DEPENDENCIES['ideal-head-of-sales'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$10,000-15,000'
  },

  'asset-24-problem-validation': {
    id: 'asset-24-problem-validation',
    assetNumber: 24,
    title: 'Problem Validation Survey',
    description: 'Market validation survey with willingness-to-pay analysis and pricing insights.',
    category: 'market_validation',
    tier: 'growth',

    // COMBINED with willingness-to-pay
    strategicPrompts: ['mock-problem-validation'],
    relatedPrompts: ['willingness-to-pay'],
    implementationResources: [
      'survey-execution-plan',
      'willingness-to-pay-analysis'
    ],

    unlockThreshold: {
      milestone: 'sub_10_3',
      progress: 100
    },

    dependencies: RESOURCE_DEPENDENCIES['mock-problem-validation'],

    estimatedGenerationTime: '18 minutes',
    consultingEquivalent: '$12,000-18,000'
  },

  'asset-25-product-usage': {
    id: 'asset-25-product-usage',
    assetNumber: 25,
    title: 'Product Usage Assessment',
    description: 'Usage timing analysis and barrier mitigation strategies for adoption.',
    category: 'product_optimization',
    tier: 'growth',

    // COMBINED: 2 usage assessments
    strategicPrompts: ['product-usage-assessments', 'product-usage-timing-assessment'],
    implementationResources: [
      'onboarding-sequence-optimization',
      'usage-barrier-mitigation'
    ],

    unlockThreshold: {
      milestone: 'sub_11_1',
      progress: 25
    },

    dependencies: {
      ...RESOURCE_DEPENDENCIES['product-usage-assessments'],
      relatedPrompts: ['product-usage-assessments', 'product-usage-timing-assessment']
    },

    estimatedGenerationTime: '18 minutes',
    consultingEquivalent: '$12,000-15,000'
  },

  'asset-26-service-prototype': {
    id: 'asset-26-service-prototype',
    assetNumber: 26,
    title: 'Detailed Service Prototype',
    description: 'Service design blueprint with customer testing and iteration framework.',
    category: 'product_optimization',
    tier: 'growth',

    strategicPrompts: ['detailed-service-prototype'],
    implementationResources: [
      'service-design-implementation',
      'customer-testing-plan'
    ],

    unlockThreshold: {
      milestone: 'sub_11_1',
      progress: 50
    },

    dependencies: RESOURCE_DEPENDENCIES['detailed-service-prototype'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$12,000-18,000'
  },

  'asset-27-persona-prototyping': {
    id: 'asset-27-persona-prototyping',
    assetNumber: 27,
    title: 'Persona-Based Prototyping',
    description: 'Buyer-specific product prototypes with validation testing framework.',
    category: 'product_optimization',
    tier: 'growth',

    strategicPrompts: ['persona-based-prototyping'],
    implementationResources: [
      'prototype-validation-testing',
      'iteration-framework'
    ],

    unlockThreshold: {
      milestone: 'sub_11_1',
      progress: 75
    },

    dependencies: RESOURCE_DEPENDENCIES['persona-based-prototyping'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$10,000-15,000'
  },

  'asset-28-sales-tasks': {
    id: 'asset-28-sales-tasks',
    assetNumber: 28,
    title: 'Sales Tasks Prioritization',
    description: 'Impact-ranked sales tasks with delegation and automation strategies.',
    category: 'sales_enablement',
    tier: 'growth',

    // COMBINED: basic + advanced
    strategicPrompts: ['sales-tasks-basic', 'sales-tasks-advanced'],
    implementationResources: [
      'calendar-blocking-plan',
      'delegation-automation-matrix'
    ],

    unlockThreshold: {
      milestone: 'sub_11_1',
      progress: 100
    },

    dependencies: {
      ...RESOURCE_DEPENDENCIES['sales-tasks-basic'],
      relatedPrompts: ['sales-tasks-basic', 'sales-tasks-advanced']
    },

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$8,000-12,000'
  },

  // ============================================
  // ENTERPRISE TIER (+10 Assets, 38 Total)
  // ============================================

  'asset-29-executive-business-case': {
    id: 'asset-29-executive-business-case',
    assetNumber: 29,
    title: 'Executive Business Case Builder',
    description: 'C-suite ready business cases with ROI models and risk mitigation frameworks.',
    category: 'strategic_planning',
    tier: 'enterprise',

    strategicPrompts: ['executive-business-case'],
    implementationResources: [
      'personalized-business-cases',
      'business-case-review-process'
    ],

    unlockThreshold: {
      milestone: 'sub_11_2',
      progress: 25
    },

    dependencies: RESOURCE_DEPENDENCIES['executive-business-case'],

    estimatedGenerationTime: '20 minutes',
    consultingEquivalent: '$18,000-25,000'
  },

  'asset-30-board-presentation': {
    id: 'asset-30-board-presentation',
    assetNumber: 30,
    title: 'Board Presentation Framework',
    description: 'Investor-grade presentations with strategic narratives and data visualization.',
    category: 'strategic_planning',
    tier: 'enterprise',

    strategicPrompts: ['board-presentation'],
    implementationResources: [
      'investor-ready-slides',
      'pitch-deck-integration'
    ],

    unlockThreshold: {
      milestone: 'sub_11_2',
      progress: 50
    },

    dependencies: RESOURCE_DEPENDENCIES['board-presentation'],

    estimatedGenerationTime: '18 minutes',
    consultingEquivalent: '$15,000-20,000'
  },

  'asset-31-series-b-readiness': {
    id: 'asset-31-series-b-readiness',
    assetNumber: 31,
    title: 'Series B Readiness Assessment',
    description: 'Comprehensive fundraising preparation with investor outreach strategy.',
    category: 'fundraising',
    tier: 'enterprise',

    strategicPrompts: ['series-b-readiness'],
    implementationResources: [
      'funding-prep-checklist',
      'investor-outreach-plan'
    ],

    unlockThreshold: {
      milestone: 'sub_11_2',
      progress: 75
    },

    dependencies: RESOURCE_DEPENDENCIES['series-b-readiness'],

    estimatedGenerationTime: '20 minutes',
    consultingEquivalent: '$18,000-25,000'
  },

  'asset-32-ideal-investor': {
    id: 'asset-32-ideal-investor',
    assetNumber: 32,
    title: 'Ideal Investor Profile',
    description: 'Target investor identification with outreach strategy and pitch customization.',
    category: 'fundraising',
    tier: 'enterprise',

    strategicPrompts: ['ideal-investor-profile'],
    implementationResources: [
      'investor-target-list',
      'investor-outreach-strategy'
    ],

    unlockThreshold: {
      milestone: 'sub_11_2',
      progress: 100
    },

    dependencies: RESOURCE_DEPENDENCIES['ideal-investor-profile'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$12,000-18,000'
  },

  'asset-33-roi-models': {
    id: 'asset-33-roi-models',
    assetNumber: 33,
    title: 'Advanced ROI Models',
    description: 'Multi-scenario ROI calculators with executive presentation templates.',
    category: 'financial_justification',
    tier: 'enterprise',

    strategicPrompts: ['roi-models'],
    implementationResources: [
      'multi-scenario-calculators',
      'executive-roi-presentation'
    ],

    unlockThreshold: {
      milestone: 'sub_11_3',
      progress: 25
    },

    dependencies: RESOURCE_DEPENDENCIES['roi-models'],

    estimatedGenerationTime: '18 minutes',
    consultingEquivalent: '$15,000-20,000'
  },

  'asset-34-scenario-planning': {
    id: 'asset-34-scenario-planning',
    assetNumber: 34,
    title: 'Scenario Planning Framework',
    description: 'Strategic options analysis with decision matrices and risk assessment.',
    category: 'strategic_planning',
    tier: 'enterprise',

    strategicPrompts: ['scenario-planning'],
    implementationResources: [
      'strategic-options-analysis',
      'decision-matrix-framework'
    ],

    unlockThreshold: {
      milestone: 'sub_11_3',
      progress: 50
    },

    dependencies: RESOURCE_DEPENDENCIES['scenario-planning'],

    estimatedGenerationTime: '20 minutes',
    consultingEquivalent: '$18,000-25,000'
  },

  'asset-35-service-blueprints': {
    id: 'asset-35-service-blueprints',
    assetNumber: 35,
    title: 'Service Blueprints & FMEA',
    description: 'Process mapping with failure mode analysis and optimization strategies.',
    category: 'process_optimization',
    tier: 'enterprise',

    // COMBINED: blueprints + FMEA
    strategicPrompts: ['service-blueprints', 'service-fmea'],
    implementationResources: [
      'process-mapping-implementation',
      'failure-mode-analysis',
      'process-optimization-plan'
    ],

    unlockThreshold: {
      milestone: 'sub_11_3',
      progress: 75
    },

    dependencies: {
      ...RESOURCE_DEPENDENCIES['service-blueprints'],
      relatedPrompts: ['service-blueprints', 'service-fmea']
    },

    estimatedGenerationTime: '22 minutes',
    consultingEquivalent: '$20,000-28,000'
  },

  'asset-36-backstage-optimization': {
    id: 'asset-36-backstage-optimization',
    assetNumber: 36,
    title: 'Backstage Process Optimization',
    description: 'Internal process audit with efficiency improvement recommendations.',
    category: 'process_optimization',
    tier: 'enterprise',

    strategicPrompts: ['backstage-process-optimization'],
    implementationResources: [
      'process-audit-framework',
      'efficiency-improvement-plan'
    ],

    unlockThreshold: {
      milestone: 'sub_11_3',
      progress: 100
    },

    dependencies: RESOURCE_DEPENDENCIES['backstage-process-optimization'],

    estimatedGenerationTime: '18 minutes',
    consultingEquivalent: '$15,000-20,000'
  },

  'asset-37-jobs-to-be-done': {
    id: 'asset-37-jobs-to-be-done',
    assetNumber: 37,
    title: 'Jobs-to-Be-Done Framework',
    description: 'Customer job analysis with success metrics and messaging reframe.',
    category: 'customer_understanding',
    tier: 'enterprise',

    strategicPrompts: ['jobs-to-be-done'],
    implementationResources: [
      'messaging-reframe-guide',
      'success-metrics-definition'
    ],

    unlockThreshold: {
      milestone: 'sub_12_1',
      progress: 25
    },

    dependencies: RESOURCE_DEPENDENCIES['jobs-to-be-done'],

    estimatedGenerationTime: '15 minutes',
    consultingEquivalent: '$12,000-18,000'
  },

  'asset-38-systems-interactions': {
    id: 'asset-38-systems-interactions',
    assetNumber: 38,
    title: 'Systems Interactions Map',
    description: 'Enterprise integration architecture with technical documentation and API specs.',
    category: 'technical_architecture',
    tier: 'enterprise',

    strategicPrompts: ['systems-interactions-map'],
    implementationResources: [
      'integration-architecture-guide',
      'technical-documentation-templates'
    ],

    unlockThreshold: {
      milestone: 'sub_12_1',
      progress: 50
    },

    dependencies: RESOURCE_DEPENDENCIES['systems-interactions-map'],

    estimatedGenerationTime: '20 minutes',
    consultingEquivalent: '$18,000-25,000'
  }
};

/**
 * Get assets by tier
 */
export function getAssetsByTier(tier) {
  return Object.values(STRATEGIC_ASSETS).filter(asset => asset.tier === tier);
}

/**
 * Get asset by ID
 */
export function getAssetById(assetId) {
  return STRATEGIC_ASSETS[assetId];
}

/**
 * Get asset by number
 */
export function getAssetByNumber(assetNumber) {
  return Object.values(STRATEGIC_ASSETS).find(asset => asset.assetNumber === assetNumber);
}

/**
 * Get all strategic prompt IDs for an asset
 */
export function getStrategicPromptsForAsset(assetId) {
  const asset = STRATEGIC_ASSETS[assetId];
  if (!asset) return [];

  return [
    ...asset.strategicPrompts,
    ...(asset.relatedPrompts || [])
  ];
}

/**
 * Get cumulative dependencies for an asset
 * Returns ALL resources that must be generated before this one
 */
export function getCumulativeDependencies(assetId) {
  const asset = STRATEGIC_ASSETS[assetId];
  if (!asset || !asset.dependencies) return [];

  const deps = new Set();

  // Add direct required dependencies
  if (asset.dependencies.requiredDependencies) {
    asset.dependencies.requiredDependencies.forEach(dep => deps.add(dep));
  }

  // Add optional dependencies
  if (asset.dependencies.optionalDependencies) {
    asset.dependencies.optionalDependencies.forEach(dep => deps.add(dep));
  }

  return Array.from(deps);
}

/**
 * Calculate total generation time for a tier
 */
export function calculateTierGenerationTime(tier) {
  const assets = getAssetsByTier(tier);
  const totalMinutes = assets.reduce((sum, asset) => {
    const minutes = parseInt(asset.estimatedGenerationTime.split(' ')[0]);
    return sum + minutes;
  }, 0);

  return {
    assetCount: assets.length,
    totalMinutes,
    totalHours: (totalMinutes / 60).toFixed(1)
  };
}

export default STRATEGIC_ASSETS;
