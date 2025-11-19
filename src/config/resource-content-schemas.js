/**
 * Resource Content Schemas
 *
 * Defines the expected JSON structure for the `content` JSONB column
 * in the `resources` table for all 77 AI-generated resource types.
 *
 * This is the single source of truth for:
 * - What fields each resource type should contain
 * - How to extract specific sections (e.g., firmographics from ICP)
 * - Validation logic for resource generation
 * - Frontend display logic
 *
 * IMPORTANT: These schemas define the STRUCTURE, not the actual data.
 * The AI generates the actual content based on cumulative context.
 *
 * @see /backend/src/config/resource-dependencies.js for dependency relationships
 * @see /infra/supabase/migrations/20250127000001_create_resources_library_schema.sql for database schema
 */

/**
 * Schema Definition Format
 * @typedef {Object} ResourceContentSchema
 * @property {string} resourceId - Matches resource-dependencies.js
 * @property {string} resourceName - Human-readable name
 * @property {string} description - What this resource contains
 * @property {Object} structure - Expected JSON structure in content column
 * @property {string[]} requiredSections - Must be present for valid resource
 * @property {string[]} optionalSections - May be present depending on context
 * @property {Object} exampleQuery - SQL/JSONB query examples for common extractions
 */

export const RESOURCE_CONTENT_SCHEMAS = {
  // ============================================
  // TIER 1: CORE FOUNDATION (5 resources)
  // ============================================

  'icp-analysis': {
    resourceId: 'icp-analysis',
    resourceName: 'ICP Analysis',
    description: 'Comprehensive Ideal Customer Profile defining firmographics, psychographics, technographics, and behavioral indicators with empathy-driven emotional resonance',
    structure: {
      firmographics: {
        company_size: 'string', // e.g., "50-200 employees"
        revenue_range: 'string', // e.g., "$5M-$50M ARR"
        industries: ['string'], // e.g., ["SaaS", "B2B Technology"]
        geographic_markets: ['string'], // e.g., ["North America", "Western Europe"]
        company_stage: 'string', // e.g., "Series A-B", "Growth stage"
        organizational_structure: 'string' // e.g., "Centralized IT", "Distributed teams"
      },
      psychographics: {
        pain_points: ['string'], // Top 3-5 critical pain points
        goals_and_aspirations: ['string'], // Business goals they're trying to achieve
        decision_making_style: 'string', // "Data-driven", "Consensus-based", etc.
        risk_tolerance: 'string', // "Conservative", "Innovative", "Risk-averse"
        values_and_priorities: ['string'] // What they care about most
      },
      technographics: {
        tech_stack: ['string'], // Current technologies they use
        tech_maturity_level: 'string', // "Early adopter", "Pragmatist", "Laggard"
        integration_requirements: ['string'], // Must integrate with X, Y, Z
        data_infrastructure: 'string', // Cloud, on-prem, hybrid
        security_compliance: ['string'] // SOC2, HIPAA, GDPR, etc.
      },
      behavioral_indicators: {
        buying_signals: ['string'], // Events/triggers that indicate readiness
        research_behavior: 'string', // How they research solutions
        content_preferences: ['string'], // Whitepapers, demos, case studies
        decision_timeline: 'string', // "3-6 months", "9-12 months"
        budget_cycle: 'string' // "Q4 planning", "Annual budget", etc.
      },
      negative_indicators: {
        red_flags: ['string'], // Signals this is a bad-fit prospect
        disqualifying_factors: ['string'] // Automatic disqualifiers
      },
      summary: {
        executive_summary: 'string', // 2-3 sentence overview
        key_characteristics: ['string'], // Top 5 defining traits
        ideal_customer_statement: 'string' // One sentence: "We serve..."
      },
      // NEW: Critical Need Context (Priority 1)
      criticalNeedContext: {
        runwayMonths: 'number', // e.g., 14
        fundingPressure: 'string', // e.g., "Series A required in 90 days"
        boardMilestones: ['string'], // e.g., ["5-10 enterprise logos", "$5M ARR"]
        recentHires: ['string'], // e.g., ["VP Enterprise Sales hired 8 months ago"]
        observablePainSignals: ['string'], // e.g., ["Losing deals at CFO stage"]
        criticalSuccessMetrics: [
          {
            metric: 'string', // e.g., "Close 3-5 enterprise deals"
            deadline: 'string', // e.g., "90 days"
            impact: 'string' // e.g., "Extends runway 6-9 months"
          }
        ]
      }
    },
    requiredSections: ['firmographics', 'psychographics', 'technographics', 'behavioral_indicators', 'summary'],
    optionalSections: ['negative_indicators', 'criticalNeedContext'],
    exampleQuery: {
      sql: "SELECT content->'firmographics' AS firmographics FROM resources WHERE title = 'ICP Analysis'",
      javascript: "const firmographics = resource.content.firmographics"
    }
  },

  'target-buyer-personas': {
    resourceId: 'target-buyer-personas',
    resourceName: 'Target Buyer Personas',
    description: 'Detailed buyer personas (3-5 personas) with demographics, psychographics, empathy maps, Core Worries, and buying behavior',
    structure: {
      personas: [
        {
          persona_id: 'string', // e.g., "persona-1-vp-engineering"
          persona_name: 'string', // e.g., "VP of Engineering, Sarah"
          title_role: 'string',
          seniority_level: 'string', // "C-Level", "VP", "Director", "Manager"
          demographics: {
            age_range: 'string',
            education_level: 'string',
            years_in_role: 'string',
            career_background: 'string'
          },
          psychographics: {
            primary_pain_points: ['string'], // Top 3-5 specific pains
            goals_and_motivations: ['string'], // What drives them
            fears_and_concerns: ['string'], // What keeps them up at night
            values_and_beliefs: ['string'] // Professional values
          },
          // NEW: Empathy Map (Priority 1)
          empathyMap: {
            see: ['string'], // Observable external reality
            hear: ['string'], // Direct feedback from board/team/customers
            thinkAndFeel: ['string'], // Core Worries, hidden concerns, emotional pressures
            sayAndDo: {
              public: ['string'], // Public statements/behavior
              private: ['string'] // Private behavior/actions
            },
            pains: ['string'], // Professional risks, emotional burdens
            gains: ['string'] // Professional relief, career advancement
          },
          // NEW: Emotional Drivers (Priority 1)
          hiddenAmbitions: ['string'], // Career goals not publicly stated
          failureConsequences: ['string'], // What happens if they don't succeed
          careerStage: 'string', // "First-time VP Sales", "Proven CRO"
          successMetrics: ['string'], // What they're measured on
          buying_behavior: {
            decision_making_role: 'string', // "Economic buyer", "Technical buyer", "Champion"
            influence_level: 'string', // "High", "Medium", "Low"
            typical_objections: ['string'],
            preferred_communication: ['string'], // "Email", "LinkedIn", "Phone"
            content_preferences: ['string'] // "Technical whitepapers", "Case studies"
          },
          day_in_the_life: {
            typical_day_description: 'string',
            key_responsibilities: ['string'],
            tools_and_platforms: ['string'],
            collaboration_patterns: 'string'
          },
          messaging_approach: {
            value_proposition: 'string', // Tailored to this persona
            key_talking_points: ['string'],
            proof_points_needed: ['string'] // What evidence they need to see
          }
        }
      ],
      buying_committee: {
        typical_committee_structure: ['string'], // Who's typically involved
        consensus_building_approach: 'string',
        average_committee_size: 'number'
      },
      summary: {
        executive_summary: 'string',
        primary_persona: 'string', // Which persona is most important
        secondary_personas: ['string']
      }
    },
    requiredSections: ['personas', 'summary'],
    optionalSections: ['buying_committee'],
    exampleQuery: {
      sql: "SELECT content->'personas'->0 AS primary_persona FROM resources WHERE title = 'Target Buyer Personas'",
      javascript: "const primaryPersona = resource.content.personas[0]; const coreWorry = primaryPersona.empathyMap.thinkAndFeel[0]"
    }
  },

  'empathy-maps': {
    resourceId: 'empathy-maps',
    resourceName: 'Empathy Maps',
    description: 'Detailed empathy maps for each buyer persona showing what they think, feel, see, hear, say, do with Core Worry identification and empathy-driven insights',
    structure: {
      empathy_maps: [
        {
          persona_id: 'string', // References persona from target-buyer-personas
          persona_name: 'string',
          thinks_and_feels: {
            thoughts: ['string'], // What goes through their mind
            feelings: ['string'], // Emotional states
            worries: ['string'], // Anxieties and concerns
            aspirations: ['string'] // What they hope for
          },
          sees: {
            environment: ['string'], // What's in their environment
            market_trends: ['string'], // What they observe in market
            competitors: ['string'], // What competition is doing
            influences: ['string'] // Who/what influences them
          },
          hears: {
            what_boss_says: ['string'],
            what_peers_say: ['string'],
            what_industry_says: ['string'],
            what_media_says: ['string']
          },
          says_and_does: {
            public_statements: ['string'], // What they say publicly
            private_thoughts: ['string'], // What they really think
            actions_taken: ['string'], // What they actually do
            contradictions: ['string'] // Gaps between words and actions
          },
          pains: {
            frustrations: ['string'],
            obstacles: ['string'],
            risks: ['string']
          },
          gains: {
            wants_and_needs: ['string'],
            measures_of_success: ['string'],
            obstacles_to_remove: ['string']
          },
          // NEW: Empathy Alignment (Priority 1)
          empathyAlignment: {
            coreWorryIdentified: 'string', // Primary Core Worry from thinks_and_feels
            reliefSought: 'string', // What relief they're seeking (from gains)
            careerImpact: 'string', // How this affects their career trajectory
            urgencyDrivers: ['string'] // What makes this urgent now
          }
        }
      ],
      insights: {
        key_patterns: ['string'], // Patterns across all personas
        emotional_drivers: ['string'], // Primary emotional motivators
        messaging_implications: ['string'], // What this means for messaging
        // NEW: Cross-Persona Empathy Insights (Priority 1)
        sharedCoreWorries: ['string'], // Core Worries that appear across multiple personas
        divergentReliefs: ['string'], // Different relief needs per persona
        criticalNeedPatterns: ['string'] // Common urgency themes
      }
    },
    requiredSections: ['empathy_maps'],
    optionalSections: ['insights'],
    exampleQuery: {
      sql: "SELECT content->'empathy_maps'->0->'empathyAlignment'->'coreWorryIdentified' AS core_worry FROM resources WHERE title = 'Empathy Maps'",
      javascript: "const coreWorry = resource.content.empathy_maps[0].empathyAlignment.coreWorryIdentified; const personaPains = resource.content.empathy_maps[0].pains"
    }
  },

  'refined-product-description': {
    resourceId: 'refined-product-description',
    resourceName: 'Refined Product Description',
    description: 'Enterprise-grade product description with clear business language, avoiding technical jargon, connected to buyer Core Worries and emotional relief',
    structure: {
      executive_summary: 'string', // 2-3 sentences, board-room ready
      product_overview: {
        what_it_is: 'string', // Plain language description
        what_it_does: 'string', // Core functionality
        who_its_for: 'string', // Target users
        why_it_matters: 'string' // Business impact
      },
      key_capabilities: [
        {
          capability_name: 'string',
          business_value: 'string', // Not technical features
          use_case: 'string',
          differentiation: 'string', // Why this matters vs alternatives
          // NEW: Empathy Connection (Priority 1)
          empathyConnection: {
            coreWorryAddressed: 'string', // Which Core Worry this capability relieves
            emotionalRelief: 'string', // What burden this lifts (first-person)
            careerEnablement: 'string' // How this enables career advancement
          }
        }
      ],
      business_outcomes: {
        primary_outcomes: ['string'], // Top 3 business results
        measurable_impact: ['string'], // Quantifiable improvements
        time_to_value: 'string' // How quickly they see results
      },
      positioning: {
        category: 'string', // What category you compete in
        unique_value: 'string', // What makes you different
        competitive_alternatives: ['string'], // What buyers compare you to
        positioning_statement: 'string' // One sentence positioning
      },
      technical_overview: {
        architecture_summary: 'string', // High-level, non-technical
        integration_approach: 'string',
        security_compliance: ['string'],
        deployment_options: ['string']
      },
      // NEW: Overall Empathy Alignment (Priority 1)
      empathyAlignment: {
        primaryCoreWorry: 'string', // Main Core Worry this product addresses
        overallRelief: 'string', // Overall burden lifted
        careerWin: 'string', // Career advancement enabled
        criticalNeedAlignment: {
          urgencyMet: 'string', // How product meets critical timeline
          survivalImpact: 'string' // Impact on runway/funding/survival
        }
      }
    },
    requiredSections: ['executive_summary', 'product_overview', 'key_capabilities', 'business_outcomes', 'positioning'],
    optionalSections: ['technical_overview', 'empathyAlignment'],
    exampleQuery: {
      sql: "SELECT content->'empathyAlignment'->'primaryCoreWorry' AS core_worry, content->'executive_summary' AS exec_summary FROM resources WHERE title = 'Refined Product Description'",
      javascript: "const coreWorry = resource.content.empathyAlignment.primaryCoreWorry; const execSummary = resource.content.executive_summary"
    }
  },

  'value-messaging': {
    resourceId: 'value-messaging',
    resourceName: 'Value Messaging',
    description: 'Persona-aligned value propositions, messaging hierarchy, SEO keywords, and outreach templates with empathy-driven emotional resonance and Core Worry alignment',
    structure: {
      core_value_proposition: {
        master_value_prop: 'string', // Universal value prop
        positioning_statement: 'string',
        elevator_pitch: 'string', // 30 second version
        tagline: 'string' // 5-7 words
      },
      persona_specific_messaging: [
        {
          persona_id: 'string',
          persona_name: 'string',
          value_proposition: 'string', // Tailored to this persona
          key_benefits: ['string'], // Top 3-5 benefits for this persona
          proof_points: ['string'], // Evidence/data points
          messaging_dos: ['string'], // What to emphasize
          messaging_donts: ['string'], // What to avoid
          // NEW: Empathy-Driven Messaging (Priority 1)
          empathyDrivenMessaging: {
            coreWorryAddressed: 'string', // Which Core Worry this messaging targets
            emotionalHook: 'string', // Opening that connects to Core Worry
            reliefStatement: 'string', // How this lifts the burden (first-person)
            careerWinFraming: 'string', // How to frame career advancement
            urgencyLanguage: 'string' // How to communicate Critical Need Context
          }
        }
      ],
      messaging_hierarchy: {
        tier_1_critical: ['string'], // Always include
        tier_2_important: ['string'], // Include when relevant
        tier_3_supporting: ['string'] // Use for depth
      },
      seo_keywords: {
        primary_keywords: ['string'], // Top 5 keywords
        secondary_keywords: ['string'],
        long_tail_keywords: ['string'],
        buyer_intent_keywords: ['string'] // High-intent search terms
      },
      outreach_templates: [
        {
          template_name: 'string',
          use_case: 'string', // When to use this
          subject_line: 'string',
          email_body: 'string',
          call_to_action: 'string',
          personalization_fields: ['string'], // Variables to customize
          // NEW: Empathy Template Guidance (Priority 1)
          empathyGuidance: {
            coreWorryToReference: 'string', // Which Core Worry to mention
            reliefPromise: 'string', // What relief to promise
            urgencyTrigger: 'string' // Critical Need Context to reference
          }
        }
      ],
      conversation_starters: {
        discovery_questions: ['string'],
        objection_responses: [
          {
            objection: 'string',
            response: 'string',
            // NEW: Empathy-Based Response (Priority 1)
            empathyResponse: {
              coreWorryReframe: 'string', // How to reframe objection as Core Worry
              reliefRedirect: 'string' // Redirect to emotional relief
            }
          }
        ],
        transition_phrases: ['string'] // Smooth conversation pivots
      },
      // NEW: Overall Empathy Messaging Framework (Priority 1)
      empathyMessagingFramework: {
        primaryCoreWorries: ['string'], // Top Core Worries addressed in messaging
        emotionalToneGuidance: 'string', // Overall tone for empathy-driven content
        reliefThemes: ['string'], // Key relief themes to emphasize
        careerWinThemes: ['string'], // Career advancement themes
        criticalNeedFraming: 'string' // How to frame urgency across all messaging
      }
    },
    requiredSections: ['core_value_proposition', 'persona_specific_messaging', 'messaging_hierarchy', 'seo_keywords'],
    optionalSections: ['outreach_templates', 'conversation_starters', 'empathyMessagingFramework'],
    exampleQuery: {
      sql: "SELECT content->'persona_specific_messaging'->0->'empathyDrivenMessaging' AS empathy_messaging, content->'seo_keywords'->'primary_keywords' AS seo_keywords FROM resources WHERE title = 'Value Messaging'",
      javascript: "const empathyMessaging = resource.content.persona_specific_messaging[0].empathyDrivenMessaging; const seoKeywords = resource.content.seo_keywords.primary_keywords"
    }
  },

  // ============================================
  // TIER 2: BUYER INTELLIGENCE (4 resources)
  // ============================================

  'compelling-events': {
    resourceId: 'compelling-events',
    resourceName: 'Compelling Events',
    description: 'Trigger events and buying signals that indicate prospect readiness to purchase',
    structure: {
      trigger_events: [
        {
          event_name: 'string',
          description: 'string',
          urgency_level: 'string', // "Critical", "High", "Medium", "Low"
          detection_methods: ['string'], // How to identify this event
          typical_timeline: 'string', // Window of opportunity
          messaging_approach: 'string' // How to respond to this event
        }
      ],
      organizational_changes: {
        leadership_changes: ['string'], // New exec, role changes
        restructuring: ['string'], // Org structure changes
        mergers_acquisitions: ['string'],
        funding_events: ['string'] // Series A/B/C, IPO prep
      },
      business_challenges: {
        performance_gaps: ['string'], // Missing targets
        competitive_pressure: ['string'], // Losing market share
        operational_inefficiencies: ['string'],
        regulatory_compliance: ['string'] // New regulations
      },
      growth_initiatives: {
        expansion_plans: ['string'], // New markets, products
        digital_transformation: ['string'],
        technology_modernization: ['string']
      },
      buying_signals: {
        early_stage_signals: ['string'], // Research phase
        mid_stage_signals: ['string'], // Evaluation phase
        late_stage_signals: ['string'], // Decision phase
        intent_data_indicators: ['string'] // Third-party intent signals
      },
      monitoring_strategy: {
        data_sources: ['string'], // Where to look for signals
        alert_criteria: ['string'], // When to act
        response_playbook: ['string'] // How to respond
      }
    },
    requiredSections: ['trigger_events', 'buying_signals'],
    optionalSections: ['organizational_changes', 'business_challenges', 'growth_initiatives', 'monitoring_strategy'],
    exampleQuery: {
      sql: "SELECT content->'buying_signals'->'late_stage_signals' AS late_signals FROM resources WHERE title = 'Compelling Events'",
      javascript: "const lateSignals = resource.content.buying_signals.late_stage_signals"
    }
  },

  'buyer-persona-rating': {
    resourceId: 'buyer-persona-rating',
    resourceName: 'Buyer Persona Rating',
    description: 'Scoring system to rate prospect fit against ideal buyer personas',
    structure: {
      rating_framework: {
        scoring_methodology: 'string',
        total_possible_score: 'number',
        tier_definitions: {
          tier_1_hot: { min_score: 'number', max_score: 'number', description: 'string' },
          tier_2_warm: { min_score: 'number', max_score: 'number', description: 'string' },
          tier_3_cold: { min_score: 'number', max_score: 'number', description: 'string' },
          tier_4_unqualified: { min_score: 'number', max_score: 'number', description: 'string' }
        }
      },
      scoring_criteria: [
        {
          criterion_name: 'string',
          category: 'string', // "Firmographic", "Behavioral", "Engagement"
          weight: 'number', // Percentage of total score
          scoring_rules: [
            {
              condition: 'string',
              points: 'number'
            }
          ]
        }
      ],
      persona_fit_scores: [
        {
          persona_id: 'string',
          persona_name: 'string',
          required_attributes: ['string'],
          preferred_attributes: ['string'],
          disqualifying_attributes: ['string']
        }
      ],
      prioritization_logic: {
        tier_1_actions: ['string'], // How to handle hot prospects
        tier_2_actions: ['string'], // Warm prospect nurture
        tier_3_actions: ['string'], // Cold prospect long-term nurture
        tier_4_actions: ['string'] // Unqualified - discard or archive
      }
    },
    requiredSections: ['rating_framework', 'scoring_criteria'],
    optionalSections: ['persona_fit_scores', 'prioritization_logic'],
    exampleQuery: {
      sql: "SELECT content->'rating_framework'->'tier_definitions' AS tiers FROM resources WHERE title = 'Buyer Persona Rating'",
      javascript: "const tiers = resource.content.rating_framework.tier_definitions"
    }
  },

  'cost-of-inaction-calculator': {
    resourceId: 'cost-of-inaction-calculator',
    resourceName: 'Cost of Inaction Calculator',
    description: 'ROI calculator showing the financial cost of not solving the problem',
    structure: {
      problem_statement: {
        core_problem: 'string',
        current_state_description: 'string',
        impact_if_unresolved: 'string'
      },
      cost_categories: [
        {
          category_name: 'string',
          description: 'string',
          calculation_method: 'string',
          input_variables: [
            {
              variable_name: 'string',
              data_type: 'string', // "number", "percentage", "currency"
              default_value: 'string',
              explanation: 'string'
            }
          ],
          formula: 'string', // Mathematical formula
          annual_cost_impact: 'number'
        }
      ],
      total_cost_of_inaction: {
        annual_cost: 'number',
        three_year_cost: 'number',
        five_year_cost: 'number',
        compounding_factors: ['string'] // What makes this worse over time
      },
      opportunity_costs: {
        lost_revenue: 'number',
        lost_productivity: 'number',
        competitive_disadvantage: 'string',
        innovation_gap: 'string'
      },
      visualization_data: {
        chart_type: 'string', // "bar", "line", "waterfall"
        data_points: [
          {
            label: 'string',
            value: 'number'
          }
        ]
      },
      messaging_insights: {
        urgency_language: ['string'],
        risk_framing: ['string'],
        call_to_action: 'string'
      }
    },
    requiredSections: ['problem_statement', 'cost_categories', 'total_cost_of_inaction'],
    optionalSections: ['opportunity_costs', 'visualization_data', 'messaging_insights'],
    exampleQuery: {
      sql: "SELECT content->'total_cost_of_inaction'->'annual_cost' AS annual_cost FROM resources WHERE title = 'Cost of Inaction Calculator'",
      javascript: "const annualCost = resource.content.total_cost_of_inaction.annual_cost"
    }
  },

  'negative-persona': {
    resourceId: 'negative-persona',
    resourceName: 'Negative Persona',
    description: 'Anti-personas defining who NOT to sell to - characteristics of bad-fit prospects',
    structure: {
      negative_personas: [
        {
          persona_id: 'string',
          persona_name: 'string', // e.g., "Bargain Hunter Bob"
          description: 'string',
          disqualifying_characteristics: {
            firmographic: ['string'], // Wrong company size, industry, etc.
            behavioral: ['string'], // Wrong buying behavior
            attitudinal: ['string'], // Wrong mindset/values
            resource_constraints: ['string'] // Can't afford, no time, etc.
          },
          red_flags: ['string'], // Warning signs in conversation
          why_bad_fit: {
            will_churn: 'string', // Reasons they won't stick
            high_support_cost: 'string', // Will drain resources
            poor_reference: 'string', // Won't be a good advocate
            wrong_use_case: 'string' // Product doesn't solve their problem
          },
          disqualification_questions: ['string'], // Questions to identify them
          polite_decline_templates: ['string'] // How to say no gracefully
        }
      ],
      avoidance_strategy: {
        screening_criteria: ['string'], // Pre-qualify before engaging
        lead_scoring_deductions: ['string'], // Negative scoring factors
        automated_disqualification_rules: ['string']
      },
      cost_of_bad_fit_customer: {
        acquisition_cost_wasted: 'number',
        support_burden: 'string',
        team_morale_impact: 'string',
        reputation_risk: 'string'
      }
    },
    requiredSections: ['negative_personas'],
    optionalSections: ['avoidance_strategy', 'cost_of_bad_fit_customer'],
    exampleQuery: {
      sql: "SELECT content->'negative_personas'->0->'red_flags' AS red_flags FROM resources WHERE title = 'Negative Persona'",
      javascript: "const redFlags = resource.content.negative_personas[0].red_flags"
    }
  },

  // ============================================
  // TIER 2: SCORING & FILTERING (4 resources)
  // ============================================

  'icp-rating-system': {
    resourceId: 'icp-rating-system',
    resourceName: 'ICP Rating System',
    description: 'Transforms abstract ICP criteria into concrete scoring framework for prioritizing prospects with empathy alignment validation',
    structure: {
      rating_framework: {
        framework_name: 'string', // e.g., "Andru ICP Fit Score"
        scoring_methodology: 'string', // How the scoring works (1-100 scale, weighted categories, etc.)
        total_possible_score: 'number', // Maximum score (e.g., 100)
        minimum_viable_score: 'number', // Threshold for qualified prospect (e.g., 60)
        tier_definitions: {
          tier_1_ideal: {
            min_score: 'number', // e.g., 80
            max_score: 'number', // e.g., 100
            description: 'string', // "Perfect ICP fit - prioritize immediately"
            characteristics: ['string'], // What defines this tier
            action: 'string' // "White-glove outreach by VP Sales"
          },
          tier_2_strong: {
            min_score: 'number', // e.g., 60
            max_score: 'number', // e.g., 79
            description: 'string',
            characteristics: ['string'],
            action: 'string'
          },
          tier_3_potential: {
            min_score: 'number', // e.g., 40
            max_score: 'number', // e.g., 59
            description: 'string',
            characteristics: ['string'],
            action: 'string'
          },
          tier_4_poor_fit: {
            min_score: 'number', // e.g., 0
            max_score: 'number', // e.g., 39
            description: 'string',
            characteristics: ['string'],
            action: 'string' // "Disqualify or long-term nurture"
          }
        }
      },
      scoring_categories: [
        {
          category_name: 'string', // e.g., "Firmographic Fit"
          category_weight: 'number', // Percentage of total score (e.g., 35)
          category_description: 'string',
          scoring_criteria: [
            {
              criterion_name: 'string', // e.g., "Company Size"
              criterion_weight: 'number', // Points allocated (e.g., 15)
              scoring_rules: [
                {
                  condition: 'string', // e.g., "50-200 employees"
                  points: 'number', // e.g., 15 (full points)
                  rationale: 'string' // Why this matters
                },
                {
                  condition: 'string', // e.g., "25-50 or 200-500 employees"
                  points: 'number', // e.g., 10 (partial points)
                  rationale: 'string'
                },
                {
                  condition: 'string', // e.g., "<25 or >500 employees"
                  points: 'number', // e.g., 0 (no points)
                  rationale: 'string'
                }
              ]
            }
          ]
        }
      ],
      // NEW: Empathy Alignment Scoring (Priority 1)
      empathyAlignmentCriteria: {
        category_name: 'Empathy Alignment',
        category_weight: 'number', // e.g., 20 (percentage of total score)
        category_description: 'Measures alignment with Core Worries and Critical Need Context',
        scoring_criteria: [
          {
            criterion_name: 'Core Worry Match',
            criterion_weight: 'number', // e.g., 10 points
            scoring_rules: [
              {
                condition: 'string', // e.g., "Exhibits primary Core Worry directly"
                points: 'number', // Full points
                rationale: 'string' // Why this matters for empathy-driven outreach
              },
              {
                condition: 'string', // e.g., "Exhibits secondary Core Worry"
                points: 'number', // Partial points
                rationale: 'string'
              },
              {
                condition: 'string', // e.g., "No evidence of Core Worry alignment"
                points: 'number', // Zero points
                rationale: 'string'
              }
            ]
          },
          {
            criterion_name: 'Critical Need Urgency',
            criterion_weight: 'number', // e.g., 10 points
            scoring_rules: [
              {
                condition: 'string', // e.g., "Critical urgency signals present (funding round, board pressure)"
                points: 'number', // Full points
                rationale: 'string'
              },
              {
                condition: 'string', // e.g., "Moderate urgency (growth goals, competitive pressure)"
                points: 'number', // Partial points
                rationale: 'string'
              },
              {
                condition: 'string', // e.g., "No urgency indicators"
                points: 'number', // Zero points
                rationale: 'string'
              }
            ]
          }
        ]
      },
      data_sources: {
        required_data_points: ['string'], // What data is needed to score
        recommended_sources: ['string'], // Where to get this data (ZoomInfo, LinkedIn, etc.)
        manual_override_allowed: 'boolean' // Can sales override score?
      },
      implementation_guide: {
        salesforce_integration: 'string', // How to implement in Salesforce
        scoring_automation: 'string', // How to automate scoring
        threshold_calibration: 'string', // How to adjust thresholds over time
        reporting_dashboard: 'string' // How to visualize scores
      }
    },
    requiredSections: ['rating_framework', 'scoring_categories'],
    optionalSections: ['data_sources', 'implementation_guide', 'empathyAlignmentCriteria'],
    exampleQuery: {
      sql: "SELECT content->'empathyAlignmentCriteria'->'scoring_criteria' AS empathy_scoring, content->'rating_framework'->'tier_definitions'->'tier_1_ideal' AS top_tier FROM resources WHERE title = 'ICP Rating System'",
      javascript: "const empathyScoring = resource.content.empathyAlignmentCriteria.scoring_criteria; const topTier = resource.content.rating_framework.tier_definitions.tier_1_ideal"
    }
  },

  'buyer-persona-rating': {
    resourceId: 'buyer-persona-rating',
    resourceName: 'Buyer Persona Rating',
    description: 'Scores individual contacts on persona alignment to focus on right decision-makers with Core Worry alignment validation',
    structure: {
      rating_framework: {
        scoring_methodology: 'string', // How contacts are scored
        total_possible_score: 'number', // e.g., 100
        qualification_threshold: 'number', // Minimum score to engage (e.g., 50)
        persona_match_importance: 'number' // How much persona match weighs (e.g., 60%)
      },
      persona_scoring_criteria: [
        {
          persona_id: 'string', // References persona from target-buyer-personas
          persona_name: 'string',
          ideal_score: 'number', // Perfect match score (e.g., 100)
          scoring_attributes: [
            {
              attribute_name: 'string', // e.g., "Job Title Match"
              attribute_weight: 'number', // Points (e.g., 25)
              perfect_match_criteria: ['string'], // Exact titles
              partial_match_criteria: ['string'], // Close titles
              no_match_criteria: ['string'] // Wrong titles
            },
            {
              attribute_name: 'string', // e.g., "Seniority Level"
              attribute_weight: 'number',
              perfect_match_criteria: ['string'], // "VP", "C-Level"
              partial_match_criteria: ['string'], // "Director"
              no_match_criteria: ['string'] // "Manager", "Individual Contributor"
            },
            {
              attribute_name: 'string', // e.g., "Department"
              attribute_weight: 'number',
              perfect_match_criteria: ['string'],
              partial_match_criteria: ['string'],
              no_match_criteria: ['string']
            },
            {
              attribute_name: 'string', // e.g., "Engagement Signals"
              attribute_weight: 'number',
              scoring_rules: [
                {
                  signal: 'string', // "Visited pricing page 3+ times"
                  points: 'number'
                }
              ]
            }
          ],
          // NEW: Empathy Alignment Validation (Priority 1)
          empathyAlignmentValidation: {
            primaryCoreWorry: 'string', // Core Worry this persona experiences
            coreWorryIndicators: ['string'], // Observable signals of this Core Worry
            reliefSensitivity: 'string', // How much this persona values relief
            urgencyDrivers: ['string'], // What creates urgency for this persona
            scoringBonus: 'number' // Bonus points if Core Worry indicators present (e.g., 10)
          }
        }
      ],
      engagement_prioritization: {
        tier_1_high_priority: {
          score_range: { min: 'number', max: 'number' }, // e.g., 80-100
          engagement_strategy: 'string',
          outreach_method: ['string'], // "Personalized email", "LinkedIn", "Phone"
          messaging_approach: 'string',
          time_investment: 'string', // "30 min research + custom deck"
          // NEW: Empathy-Driven Outreach (Priority 1)
          empathyOutreachGuidance: {
            coreWorryToAddress: 'string', // Which Core Worry to mention
            emotionalHook: 'string', // Opening that connects to Core Worry
            reliefPromise: 'string', // What relief to promise
            urgencyFraming: 'string' // How to communicate Critical Need Context
          }
        },
        tier_2_medium_priority: {
          score_range: { min: 'number', max: 'number' },
          engagement_strategy: 'string',
          outreach_method: ['string'],
          messaging_approach: 'string',
          time_investment: 'string',
          empathyOutreachGuidance: {
            coreWorryToAddress: 'string',
            emotionalHook: 'string',
            reliefPromise: 'string',
            urgencyFraming: 'string'
          }
        },
        tier_3_low_priority: {
          score_range: { min: 'number', max: 'number' },
          engagement_strategy: 'string',
          outreach_method: ['string'],
          messaging_approach: 'string',
          time_investment: 'string'
        },
        tier_4_disqualify: {
          score_range: { min: 'number', max: 'number' },
          action: 'string' // "Do not contact - wrong persona"
        }
      },
      multi_threading_strategy: {
        primary_persona_focus: 'string', // Which persona to start with
        secondary_personas: ['string'], // Who to bring in later
        champion_identification: 'string', // How to find internal champion
        committee_navigation: 'string' // How to map buying committee
      },
      automation_logic: {
        data_enrichment_triggers: ['string'], // When to enrich contact data
        score_update_frequency: 'string', // How often to recalculate
        alert_criteria: ['string'] // When to notify sales
      }
    },
    requiredSections: ['rating_framework', 'persona_scoring_criteria', 'engagement_prioritization'],
    optionalSections: ['multi_threading_strategy', 'automation_logic'],
    exampleQuery: {
      sql: "SELECT content->'persona_scoring_criteria'->0->'empathyAlignmentValidation' AS empathy_validation, content->'persona_scoring_criteria'->0->'scoring_attributes' AS persona_criteria FROM resources WHERE title = 'Buyer Persona Rating'",
      javascript: "const empathyValidation = resource.content.persona_scoring_criteria[0].empathyAlignmentValidation; const personaCriteria = resource.content.persona_scoring_criteria[0].scoring_attributes"
    }
  },

  'negative-buyer-personas': {
    resourceId: 'negative-buyer-personas',
    resourceName: 'Negative Buyer Personas',
    description: 'Identifies bad-fit buyers within ICP to prevent wasted sales cycles with empathy misalignment detection',
    structure: {
      negative_personas: [
        {
          persona_id: 'string', // e.g., "negative-persona-1-bargain-hunter"
          persona_name: 'string', // e.g., "Bargain Hunter Bob"
          persona_archetype: 'string', // e.g., "Price Shopper", "Tire Kicker", "Wrong Authority"
          description: 'string',
          warning_signs: {
            behavioral_red_flags: [
              {
                flag: 'string', // e.g., "Immediately asks for discount"
                severity: 'string', // "Critical", "High", "Medium"
                disqualify_immediately: 'boolean'
              }
            ],
            conversational_red_flags: [
              {
                phrase: 'string', // e.g., "What's your best price?"
                context: 'string', // When/how they say it
                response_strategy: 'string' // How to handle
              }
            ],
            firmographic_red_flags: ['string'], // Company-level warning signs
            attitudinal_red_flags: ['string'], // Mindset/values misalignment
            // NEW: Empathy Misalignment Indicators (Priority 1)
            empathy_misalignment_red_flags: [
              {
                indicator: 'string', // e.g., "No evidence of Core Worry - focused only on price"
                coreWorryMismatch: 'string', // Which Core Worry they DON'T have
                reliefSeekingMismatch: 'string', // What relief they seek that we don't provide
                urgencyMismatch: 'string', // e.g., "No urgency - just browsing"
                severity: 'string' // "Critical", "High", "Medium"
              }
            ]
          },
          why_bad_fit: {
            will_churn: {
              reason: 'string',
              typical_churn_timeline: 'string', // e.g., "3-6 months"
              churn_indicators: ['string']
            },
            high_support_cost: {
              reason: 'string',
              support_burden_estimate: 'string', // e.g., "5x average"
              resource_drain: ['string']
            },
            poor_reference: {
              reason: 'string',
              reputation_risk: 'string',
              advocacy_potential: 'string' // "Will never refer"
            },
            wrong_use_case: {
              reason: 'string',
              product_mismatch: 'string',
              alternative_solution: 'string' // What they actually need
            },
            budget_mismatch: {
              reason: 'string',
              willingness_to_pay_gap: 'string',
              value_perception_issue: 'string'
            },
            // NEW: Empathy Mismatch Analysis (Priority 1)
            empathy_mismatch: {
              reason: 'string', // e.g., "Wrong Core Worry - seeks cost reduction, not strategic transformation"
              coreWorryAlignment: 'string', // How their Core Worry differs
              reliefExpectation: 'string', // What relief they expect that we don't provide
              careerMotivation: 'string' // Career motivations that don't align
            }
          },
          typical_objections: [
            {
              objection: 'string',
              frequency: 'string', // "Always", "Often", "Sometimes"
              unresolvable: 'boolean', // Can this objection be overcome?
              why_unresolvable: 'string'
            }
          ],
          cost_of_engagement: {
            sales_cycle_waste: 'string', // Time wasted
            opportunity_cost: 'string', // Deals not pursued
            team_morale_impact: 'string',
            total_estimated_cost: 'number' // Dollar cost per bad-fit customer
          }
        }
      ],
      disqualification_framework: {
        disqualification_questions: [
          {
            question: 'string', // e.g., "What's your budget for this initiative?"
            qualifying_answer: 'string',
            disqualifying_answer: 'string',
            ask_when: 'string', // "Discovery call", "Before demo", etc.
            // NEW: Empathy Alignment Check (Priority 1)
            empathy_alignment_validation: {
              coreWorryProbe: 'string', // Question to surface Core Worry
              validatingAnswer: 'string', // Answer that confirms Core Worry alignment
              disqualifyingAnswer: 'string' // Answer that reveals empathy mismatch
            }
          }
        ],
        early_warning_system: {
          stage_1_initial_contact: ['string'], // Red flags in first touch
          stage_2_discovery: ['string'], // Red flags in discovery
          stage_3_demo: ['string'], // Red flags during demo
          stage_4_proposal: ['string'] // Red flags before closing
        },
        disqualification_criteria: [
          {
            criterion: 'string',
            threshold: 'string', // When to disqualify
            exception_allowed: 'boolean',
            exception_approval: 'string' // Who can override
          }
        ]
      },
      polite_decline_strategies: {
        soft_decline_templates: [
          {
            scenario: 'string', // When to use
            message_template: 'string',
            alternative_offered: 'string', // What to suggest instead
            relationship_preservation: 'string' // Keep door open?
          }
        ],
        referral_strategy: 'string', // Where to send bad-fit leads
        nurture_vs_disqualify_logic: 'string' // When to nurture long-term vs. cut loose
      },
      team_enablement: {
        sales_training_focus: ['string'], // What to train team on
        common_mistakes: ['string'], // What reps do wrong
        discipline_required: 'string', // How to stay disciplined
        quota_pressure_override: 'string' // Resist desperation deals
      }
    },
    requiredSections: ['negative_personas', 'disqualification_framework'],
    optionalSections: ['polite_decline_strategies', 'team_enablement'],
    exampleQuery: {
      sql: "SELECT content->'negative_personas'->0->'warning_signs'->'empathy_misalignment_red_flags' AS empathy_misalignment, content->'negative_personas'->0->'warning_signs' AS warning_signs FROM resources WHERE title = 'Negative Buyer Personas'",
      javascript: "const empathyMisalignment = resource.content.negative_personas[0].warning_signs.empathy_misalignment_red_flags; const warnings = resource.content.negative_personas[0].warning_signs"
    }
  },

  'non-ideal-customer-profile': {
    resourceId: 'non-ideal-customer-profile',
    resourceName: 'Non-Ideal Customer Profile',
    description: 'Defines which industries, company stages, and budget constraints to avoid entirely with emotional mismatch criteria',
    structure: {
      executive_summary: 'string', // Who NOT to sell to and why
      disqualifying_firmographics: {
        company_size: {
          too_small: {
            threshold: 'string', // e.g., "<25 employees"
            why_disqualifying: 'string',
            exceptions: ['string'], // When small is okay
            evidence: ['string'] // Historical data supporting this
          },
          too_large: {
            threshold: 'string', // e.g., ">5,000 employees"
            why_disqualifying: 'string',
            exceptions: ['string'],
            evidence: ['string']
          }
        },
        revenue_range: {
          too_low: {
            threshold: 'string', // e.g., "<$1M ARR"
            why_disqualifying: 'string',
            budget_reality: 'string'
          },
          too_high: {
            threshold: 'string', // e.g., ">$500M ARR"
            why_disqualifying: 'string',
            procurement_complexity: 'string'
          }
        },
        industries_to_avoid: [
          {
            industry: 'string', // e.g., "Healthcare"
            reason: 'string',
            regulatory_barriers: ['string'],
            sales_cycle_issues: 'string',
            historical_win_rate: 'number', // e.g., 5%
            historical_churn_rate: 'number' // e.g., 80%
          }
        ],
        geographic_exclusions: [
          {
            region: 'string',
            reason: 'string',
            regulatory_challenges: ['string'],
            go_to_market_gap: 'string'
          }
        ],
        company_stages_to_skip: [
          {
            stage: 'string', // e.g., "Pre-seed", "Bootstrapped", "Post-IPO"
            reason: 'string',
            budget_constraints: 'string',
            decision_making_issues: 'string',
            value_alignment: 'string'
          }
        ]
      },
      disqualifying_behaviors: {
        buying_behavior_red_flags: [
          {
            behavior: 'string', // e.g., "Expects free trial with no commitment"
            why_problematic: 'string',
            conversion_likelihood: 'string' // "Near zero"
          }
        ],
        decision_making_anti_patterns: [
          {
            pattern: 'string', // e.g., "Committee of 10+ stakeholders"
            sales_cycle_impact: 'string',
            close_rate_impact: 'number'
          }
        ],
        engagement_anti_patterns: [
          {
            pattern: 'string', // e.g., "Only speaks to SDR, refuses AE call"
            signal: 'string', // What this means
            recommendation: 'string' // Disqualify or nurture?
          }
        ]
      },
      budget_and_pricing_mismatches: {
        insufficient_budget: {
          typical_budget: 'string', // What they usually have
          our_pricing_floor: 'string', // Our minimum
          gap_analysis: 'string',
          value_perception_issue: 'string'
        },
        wrong_pricing_expectations: [
          {
            expectation: 'string', // e.g., "Expects perpetual license"
            our_model: 'string', // "SaaS subscription only"
            reconcilable: 'boolean'
          }
        ],
        roi_timeframe_mismatch: {
          their_expectation: 'string', // e.g., "ROI in 30 days"
          our_reality: 'string', // e.g., "90-180 days"
          education_feasible: 'boolean'
        }
      },
      technology_and_integration_barriers: {
        incompatible_tech_stacks: [
          {
            technology: 'string', // e.g., "On-premise only infrastructure"
            our_requirement: 'string', // "Cloud-native"
            workaround_exists: 'boolean',
            workaround_cost: 'string'
          }
        ],
        integration_complexity: [
          {
            scenario: 'string',
            why_prohibitive: 'string',
            resource_requirement: 'string'
          }
        ],
        security_compliance_blockers: [
          {
            requirement: 'string', // e.g., "FedRAMP certification"
            our_status: 'string', // "Not certified"
            timeline_to_compliance: 'string' // "18+ months"
          }
        ]
      },
      cultural_and_strategic_misalignment: {
        values_mismatch: [
          {
            their_value: 'string',
            our_value: 'string',
            conflict: 'string'
          }
        ],
        strategic_direction_divergence: 'string',
        partnership_sustainability: 'string',
        // NEW: Empathy Mismatch Criteria (Priority 1)
        empathy_mismatch: {
          coreWorryMisalignment: [
            {
              theirCoreWorry: 'string', // e.g., "Cost reduction at any cost"
              ourTargetCoreWorry: 'string', // e.g., "Strategic transformation and career advancement"
              whyIncompatible: 'string', // Why this Core Worry mismatch disqualifies
              observableIndicators: ['string'] // How to detect this mismatch
            }
          ],
          reliefExpectationMismatch: {
            reliefTheySeek: 'string', // What relief they're looking for
            reliefWeProvide: 'string', // What relief we actually deliver
            gap: 'string', // Why this gap is unbridgeable
            conversionLikelihood: 'string' // "Near zero - wrong emotional driver"
          },
          urgencyMismatch: {
            theirUrgencyProfile: 'string', // e.g., "No urgency - just exploring"
            ourIdealUrgencyProfile: 'string', // e.g., "Critical funding deadline pressure"
            salesCycleImpact: 'string', // How this affects sales cycle
            closeProbability: 'string' // Realistic close rate
          },
          careerMotivationMismatch: {
            theirCareerGoals: ['string'], // What they care about professionally
            ourCareerWinAlignment: ['string'], // Career wins we enable
            misalignment: 'string' // Why we can't help them achieve their goals
          }
        }
      },
      avoidance_strategy: {
        lead_source_filtering: {
          inbound_filters: ['string'], // Marketing automation rules
          outbound_exclusions: ['string'], // SDR prospecting rules
          partner_channel_guidance: 'string'
        },
        salesforce_automation: {
          auto_disqualify_rules: [
            {
              rule: 'string',
              trigger: 'string',
              action: 'string'
            }
          ],
          lead_routing_exclusions: ['string']
        },
        team_training: {
          how_to_recognize: ['string'],
          how_to_decline_politely: ['string'],
          quota_pressure_management: 'string' // Don't take bad deals out of desperation
        }
      },
      cost_analysis: {
        average_sales_cycle_waste: 'string', // Hours per bad-fit prospect
        opportunity_cost_per_quarter: 'number', // Lost revenue pursuing bad fits
        customer_success_burden: 'string', // Support cost if they slip through
        churn_impact: 'string'
      }
    },
    requiredSections: ['executive_summary', 'disqualifying_firmographics', 'disqualifying_behaviors', 'avoidance_strategy'],
    optionalSections: ['budget_and_pricing_mismatches', 'technology_and_integration_barriers', 'cultural_and_strategic_misalignment', 'cost_analysis'],
    exampleQuery: {
      sql: "SELECT content->'cultural_and_strategic_misalignment'->'empathy_mismatch' AS empathy_mismatch, content->'disqualifying_firmographics'->'industries_to_avoid' AS bad_industries FROM resources WHERE title = 'Non-Ideal Customer Profile'",
      javascript: "const empathyMismatch = resource.content.cultural_and_strategic_misalignment.empathy_mismatch; const badIndustries = resource.content.disqualifying_firmographics.industries_to_avoid"
    }
  },

  // ============================================
  // TIER 3-8: ADDITIONAL RESOURCES
  // ============================================
  // Note: Remaining 68 resources will be defined incrementally as they are implemented
  // Use Tier 1-2 schemas as templates when creating new resource types

  'moment-in-the-life': {
    resourceId: 'moment-in-the-life',
    resourceName: 'Moment in the Life',
    description: 'Narrative descriptions of key moments in buyer journey and trigger events',
    structure: {
      buyer_journey_moments: [
        {
          moment_name: 'string',
          stage: 'string', // "Awareness", "Consideration", "Decision"
          trigger_event: 'string',
          emotional_state: 'string',
          thoughts_and_concerns: ['string'],
          actions_taken: ['string'],
          messaging_opportunity: 'string'
        }
      ],
      critical_decision_points: ['string'],
      engagement_strategy: ['string']
    },
    requiredSections: ['buyer_journey_moments'],
    optionalSections: ['critical_decision_points', 'engagement_strategy']
  },

  // Remaining 67 resources: Define schemas as you implement AI generation for each resource

};

/**
 * Get schema for a specific resource type
 * @param {string} resourceId - Resource identifier
 * @returns {ResourceContentSchema|null} Schema definition or null if not found
 */
export function getResourceContentSchema(resourceId) {
  return RESOURCE_CONTENT_SCHEMAS[resourceId] || null;
}

/**
 * Validate resource content against schema
 * @param {string} resourceId - Resource identifier
 * @param {Object} content - Content to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateResourceContent(resourceId, content) {
  const schema = getResourceContentSchema(resourceId);

  if (!schema) {
    return {
      valid: false,
      errors: [`No schema found for resource: ${resourceId}`]
    };
  }

  const errors = [];

  // Check required sections exist
  for (const requiredSection of schema.requiredSections) {
    if (!content[requiredSection]) {
      errors.push(`Missing required section: ${requiredSection}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    schema
  };
}

/**
 * Get all required sections for a resource
 * @param {string} resourceId - Resource identifier
 * @returns {string[]} Array of required section names
 */
export function getRequiredSections(resourceId) {
  const schema = getResourceContentSchema(resourceId);
  return schema?.requiredSections || [];
}

/**
 * Get optional sections for a resource
 * @param {string} resourceId - Resource identifier
 * @returns {string[]} Array of optional section names
 */
export function getOptionalSections(resourceId) {
  const schema = getResourceContentSchema(resourceId);
  return schema?.optionalSections || [];
}

/**
 * Extract specific section from resource content
 * @param {Object} content - Full resource content
 * @param {string} sectionPath - Dot-notation path (e.g., "firmographics.company_size")
 * @returns {*} Extracted value or undefined
 */
export function extractSection(content, sectionPath) {
  const parts = sectionPath.split('.');
  let current = content;

  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

export default RESOURCE_CONTENT_SCHEMAS;
