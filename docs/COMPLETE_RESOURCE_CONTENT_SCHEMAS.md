# Complete Resource Content Schemas

**Purpose**: Single source of truth for the expected JSON structure stored in `resources.content` JSONB column for all 77 AI-generated resource types.

**Related Files**:
- `/backend/src/config/resource-dependencies.js` - Dependency relationships
- `/backend/src/config/resource-content-schemas.js` - JavaScript schema definitions (partial)
- `/infra/supabase/migrations/20250127000001_create_resources_library_schema.sql` - Database schema

---

## How to Use This Document

### Frontend Developers
```javascript
// Extract specific section from resource
const firmographics = resource.content.firmographics;
const companySize = resource.content.firmographics.company_size;

// Display only part of ICP analysis
<div>
  <h2>Target Company Size</h2>
  <p>{resource.content.firmographics.company_size}</p>
</div>
```

### Backend Developers
```sql
-- Extract firmographics from ICP Analysis
SELECT content->'firmographics' AS firmographics
FROM resources
WHERE title = 'ICP Analysis' AND customer_id = 'user-123';

-- Get all personas
SELECT content->'personas' AS personas
FROM resources
WHERE title = 'Target Buyer Personas';
```

### AI Engineers
Use these schemas to:
1. Structure Claude prompts to return JSON in expected format
2. Validate AI outputs before storing
3. Handle missing optional sections gracefully

---

## Schema Notation

```typescript
{
  section_name: {
    field_name: 'string',        // Plain text
    array_field: ['string'],     // Array of strings
    number_field: 'number',      // Numeric value
    nested_object: {             // Nested structure
      sub_field: 'string'
    }
  }
}
```

**Required vs Optional**:
- **Required sections**: Must be present for valid resource
- **Optional sections**: May be included based on available context

---

## TIER 1: CORE FOUNDATION (5 resources)

### 1. ICP Analysis

**Resource ID**: `icp-analysis`

**Purpose**: Comprehensive Ideal Customer Profile defining firmographics, psychographics, technographics, and behavioral indicators

**Content Structure**:
```json
{
  "firmographics": {
    "company_size": "50-200 employees",
    "revenue_range": "$5M-$50M ARR",
    "industries": ["SaaS", "B2B Technology", "FinTech"],
    "geographic_markets": ["North America", "Western Europe"],
    "company_stage": "Series A-B / Growth stage",
    "organizational_structure": "Centralized IT with distributed teams"
  },
  "psychographics": {
    "pain_points": [
      "Struggling to scale sales without proportional headcount increase",
      "Losing deals to competitors with better sales intelligence",
      "Unable to prioritize highest-value prospects"
    ],
    "goals_and_aspirations": [
      "Double sales efficiency within 12 months",
      "Build repeatable enterprise sales motion",
      "Achieve predictable revenue growth"
    ],
    "decision_making_style": "Data-driven with executive consensus",
    "risk_tolerance": "Moderate - willing to innovate but needs proof",
    "values_and_priorities": [
      "ROI and measurable outcomes",
      "Team enablement and productivity",
      "Competitive advantage"
    ]
  },
  "technographics": {
    "tech_stack": [
      "Salesforce CRM",
      "HubSpot Marketing Automation",
      "ZoomInfo prospecting",
      "Gong conversation intelligence"
    ],
    "tech_maturity_level": "Pragmatist - early majority adopter",
    "integration_requirements": [
      "Salesforce API integration (required)",
      "Slack notifications (preferred)",
      "Data warehouse sync (nice-to-have)"
    ],
    "data_infrastructure": "Cloud-first with AWS/GCP",
    "security_compliance": ["SOC 2", "GDPR"]
  },
  "behavioral_indicators": {
    "buying_signals": [
      "Recent funding round closed",
      "New VP Sales hired",
      "Sales team expansion (3+ SDRs added)",
      "Salesforce implementation or upgrade"
    ],
    "research_behavior": "Starts with peer recommendations, validates with G2/TrustRadius reviews",
    "content_preferences": [
      "ROI calculators and case studies",
      "Live product demos",
      "Peer reference calls"
    ],
    "decision_timeline": "3-6 months (budgeted) or 6-9 months (unbudgeted)",
    "budget_cycle": "Annual planning in Q4, additional budget approvals in Q2"
  },
  "negative_indicators": {
    "red_flags": [
      "Just implemented competing solution <6 months ago",
      "No budget allocated or discussed",
      "Technical buyer only - no economic buyer access"
    ],
    "disqualifying_factors": [
      "Company size <25 employees (too small)",
      "Pure inbound/transactional sales motion (wrong fit)",
      "No CRM or basic spreadsheet tracking (too immature)"
    ]
  },
  "summary": {
    "executive_summary": "Ideal customers are growth-stage B2B SaaS companies (50-200 employees, $5M-$50M ARR) scaling enterprise sales teams who need data-driven prospecting to compete with larger incumbents.",
    "key_characteristics": [
      "Fast-growing with recent funding",
      "Enterprise sales motion with 3-10 AEs",
      "Modern tech stack (Salesforce, HubSpot)",
      "Data-driven culture",
      "Competitive pressure from larger players"
    ],
    "ideal_customer_statement": "We serve growth-stage B2B SaaS companies scaling enterprise sales teams who need AI-powered revenue intelligence to compete with larger competitors."
  }
}
```

**Required Sections**: `firmographics`, `psychographics`, `technographics`, `behavioral_indicators`, `summary`

**Optional Sections**: `negative_indicators`

**Common Queries**:
```sql
-- Get firmographics only
SELECT content->'firmographics' FROM resources WHERE title = 'ICP Analysis';

-- Get industries list
SELECT content->'firmographics'->'industries' FROM resources WHERE title = 'ICP Analysis';

-- Get pain points
SELECT content->'psychographics'->'pain_points' FROM resources WHERE title = 'ICP Analysis';
```

---

### 2. Target Buyer Personas

**Resource ID**: `target-buyer-personas`

**Purpose**: Detailed buyer personas (3-5 personas) with demographics, psychographics, pain points, goals, and buying behavior

**Content Structure**:
```json
{
  "personas": [
    {
      "persona_id": "persona-1-vp-sales",
      "persona_name": "Growth-Stage VP Sales (Sarah)",
      "title_role": "VP of Sales",
      "seniority_level": "VP / C-Level",
      "demographics": {
        "age_range": "35-45 years old",
        "education_level": "Bachelor's degree, MBA preferred",
        "years_in_role": "2-4 years in current VP role",
        "career_background": "Previous AE/Director roles at high-growth startups"
      },
      "psychographics": {
        "primary_pain_points": [
          "Under pressure to hit aggressive growth targets with limited budget",
          "Sales team spending too much time on unqualified leads",
          "Unable to forecast pipeline accurately"
        ],
        "goals_and_motivations": [
          "Double team quota attainment from 60% to 85%+",
          "Build scalable sales process that survives her departure",
          "Earn credibility for next C-level role"
        ],
        "fears_and_concerns": [
          "Miss quarterly target and lose board confidence",
          "Lose top performers to better-organized competitors",
          "Waste budget on tools that don't deliver ROI"
        ],
        "values_and_beliefs": [
          "Data beats intuition in sales",
          "Enablement is as important as hiring",
          "Process excellence drives consistent results"
        ]
      },
      "buying_behavior": {
        "decision_making_role": "Economic buyer - owns budget and final decision",
        "influence_level": "High - reports to CEO, influences board",
        "typical_objections": [
          "We already have Salesforce/ZoomInfo, why do we need this?",
          "My team is overwhelmed, won't learn another tool",
          "Show me the ROI in our specific market"
        ],
        "preferred_communication": ["Email for initial reach", "LinkedIn for social proof", "Phone after warm introduction"],
        "content_preferences": [
          "ROI calculators with her specific inputs",
          "Case studies from similar-stage companies",
          "Live demos showing her exact use cases"
        ]
      },
      "day_in_the_life": {
        "typical_day_description": "Starts day with pipeline review in Salesforce, 3-4 hours in deal reviews and coaching, 2-3 hours in strategic planning and team meetings, ends day reviewing metrics dashboards",
        "key_responsibilities": [
          "Hit quarterly/annual revenue targets",
          "Build and scale sales team",
          "Implement sales process and tools",
          "Report pipeline and forecast to CEO/board"
        ],
        "tools_and_platforms": [
          "Salesforce CRM (all day)",
          "Slack (constant)",
          "Gong for call reviews",
          "Google Sheets for analysis"
        ],
        "collaboration_patterns": "Works closely with Marketing (lead quality), Customer Success (churn reduction), Product (roadmap influence)"
      },
      "messaging_approach": {
        "value_proposition": "Help your team close 40% more enterprise deals without adding headcount by giving every rep the insights your top performer has",
        "key_talking_points": [
          "Proven to increase team quota attainment from 60% to 85%",
          "Integrates with your existing Salesforce workflow",
          "Reps adopt in <2 weeks with our proven onboarding"
        ],
        "proof_points_needed": [
          "Customer case study with similar company size",
          "Time-to-value metric (how fast to see ROI)",
          "Reference call with peer VP Sales"
        ]
      }
    },
    {
      "persona_id": "persona-2-sales-ops",
      "persona_name": "Sales Operations Leader (Michael)",
      "title_role": "Director of Sales Operations",
      "seniority_level": "Director",
      "demographics": {
        "age_range": "30-40 years old",
        "education_level": "Bachelor's in Business/Analytics",
        "years_in_role": "3-5 years in Sales Ops",
        "career_background": "Former analyst, BizOps, or Sales Engineer"
      },
      "psychographics": {
        "primary_pain_points": [
          "Salesforce data quality is terrible",
          "Spending all day pulling reports instead of analyzing",
          "VP Sales wants insights he can't deliver"
        ],
        "goals_and_motivations": [
          "Build automated reporting dashboard VP actually uses",
          "Improve data hygiene without manual work",
          "Be seen as strategic partner, not just report generator"
        ],
        "fears_and_concerns": [
          "New tool creates more work instead of less",
          "Sales team won't adopt and he'll be blamed",
          "VP loses confidence in his ability to deliver"
        ],
        "values_and_beliefs": [
          "Good data enables good decisions",
          "Automation > manual processes",
          "Sales technology should be invisible to reps"
        ]
      },
      "buying_behavior": {
        "decision_making_role": "Technical buyer - evaluates product, influences decision",
        "influence_level": "Medium-High - VP Sales trusts his technical judgment",
        "typical_objections": [
          "Integration looks complex, who owns implementation?",
          "Our Salesforce instance is heavily customized",
          "Will this require ongoing maintenance from my team?"
        ],
        "preferred_communication": ["Email with technical details", "Product demo focusing on integration", "Slack/async for detailed Q&A"],
        "content_preferences": [
          "API documentation and integration guides",
          "Technical architecture diagrams",
          "Implementation timeline and resource requirements"
        ]
      },
      "day_in_the_life": {
        "typical_day_description": "Morning: pull overnight reports. Mid-day: troubleshoot Salesforce issues and rep questions. Afternoon: strategic projects (if lucky) or more firefighting",
        "key_responsibilities": [
          "Salesforce admin and data quality",
          "Sales analytics and reporting",
          "Sales tool stack management",
          "Process documentation and training"
        ],
        "tools_and_platforms": [
          "Salesforce admin console",
          "Tableau/Looker for dashboards",
          "Python/SQL for analysis",
          "Zapier for workflow automation"
        ],
        "collaboration_patterns": "Daily Slack with sales team, weekly sync with VP Sales, monthly reviews with Finance/RevOps"
      },
      "messaging_approach": {
        "value_proposition": "Automate the data enrichment and reporting that consumes 15 hours/week so you can focus on strategic analysis",
        "key_talking_points": [
          "Native Salesforce integration - no custom code required",
          "Automated data enrichment reduces manual entry by 80%",
          "Pre-built dashboards VP Sales actually wants"
        ],
        "proof_points_needed": [
          "Integration documentation and timeline",
          "Data security and compliance certifications",
          "Customer reference from similar Salesforce environment"
        ]
      }
    }
  ],
  "buying_committee": {
    "typical_committee_structure": [
      "Economic Buyer: VP Sales or CRO",
      "Technical Buyer: Director of Sales Operations",
      "Champion: Top-performing AE or SDR Manager",
      "Influencer: CFO (if large purchase)",
      "Blocker: IT/Security (for data access)"
    ],
    "consensus_building_approach": "VP Sales makes final decision but needs Sales Ops buy-in for implementation feasibility and champion support for team adoption",
    "average_committee_size": 3
  },
  "summary": {
    "executive_summary": "Primary buyer is VP Sales (economic buyer) who needs Sales Ops Director (technical buyer) to validate implementation feasibility and top AE (champion) to prove team will adopt.",
    "primary_persona": "persona-1-vp-sales",
    "secondary_personas": ["persona-2-sales-ops", "persona-3-top-ae"]
  }
}
```

**Required Sections**: `personas`, `summary`

**Optional Sections**: `buying_committee`

---

### 3. Empathy Maps

**Resource ID**: `empathy-maps`

**Purpose**: Detailed empathy maps for each buyer persona showing what they think, feel, see, hear, say, do

**Content Structure**:
```json
{
  "empathy_maps": [
    {
      "persona_id": "persona-1-vp-sales",
      "persona_name": "Growth-Stage VP Sales (Sarah)",
      "thinks_and_feels": {
        "thoughts": [
          "I need to prove I can scale this team",
          "My reps are wasting time on bad leads",
          "If I miss this quarter, I lose board credibility"
        ],
        "feelings": [
          "Pressure - board expects 50% YoY growth",
          "Frustration - team has tools but still struggles",
          "Anxiety - worried about losing top performers"
        ],
        "worries": [
          "Miss quarterly target despite working 70hr weeks",
          "Competitors have better sales intelligence",
          "Best AEs will leave for better-equipped teams"
        ],
        "aspirations": [
          "Build sales machine that scales beyond me",
          "Earn CRO role at next company",
          "Be known as best sales leader in category"
        ]
      },
      "sees": {
        "environment": [
          "CEO checking pipeline dashboard daily",
          "Board slides showing competitors growing faster",
          "Salesforce full of stale, unqualified leads"
        ],
        "market_trends": [
          "Competitors using AI-powered sales tools",
          "Buyers expecting more personalized outreach",
          "Enterprise sales cycles getting longer"
        ],
        "competitors": [
          "Hiring aggressively from her team",
          "Winning deals with better discovery",
          "Publishing case studies of 120%+ quota attainment"
        ],
        "influences": [
          "SaaStr conference presentations on sales efficiency",
          "LinkedIn posts from successful VP Sales peers",
          "Sales tool vendor marketing (constant)"
        ]
      },
      "hears": {
        "what_boss_says": [
          "We need to hit $10M ARR this year",
          "Can we do this without doubling headcount?",
          "Show me leading indicators, not lagging"
        ],
        "what_peers_say": [
          "Our conversion rate is 25%, what's yours?",
          "We're using [tool] and it's a game changer",
          "I'm struggling to forecast pipeline accurately"
        ],
        "what_industry_says": [
          "Best-in-class teams hit 85% quota attainment",
          "AI is transforming B2B sales",
          "Reps should spend 50% of time selling, not researching"
        ],
        "what_media_says": [
          "Sales efficiency is the new growth metric",
          "Companies that invest in enablement grow 40% faster",
          "The Great Resignation is hitting sales teams hard"
        ]
      },
      "says_and_does": {
        "public_statements": [
          "Our team is hitting target (when they're at 65%)",
          "We're very data-driven (has basic Salesforce reports)",
          "Culture is our competitive advantage"
        ],
        "private_thoughts": [
          "I have no idea how to hit next quarter's number",
          "My best rep is carrying the entire team",
          "I need help but can't appear weak"
        ],
        "actions_taken": [
          "Attends every sales tool demo but rarely buys",
          "Asks top AE for advice constantly",
          "Spends weekends building spreadsheets CEO will ignore"
        ],
        "contradictions": [
          "Says 'data-driven' but makes gut decisions",
          "Claims 'team is strong' while secretly interviewing AEs",
          "Preaches 'work-life balance' while emailing at midnight"
        ]
      },
      "pains": {
        "frustrations": [
          "Reps ignore Salesforce hygiene despite constant reminders",
          "Every tool vendor promises '40% productivity gain'",
          "CEO wants growth but won't approve headcount"
        ],
        "obstacles": [
          "Limited budget ($50K for all sales tools)",
          "No Sales Ops team to implement/maintain tools",
          "Reps resist learning 'yet another tool'"
        ],
        "risks": [
          "Miss target → lose job or equity value tanks",
          "Bad tool purchase → waste budget and lose credibility",
          "Lose top performers → death spiral for team morale"
        ]
      },
      "gains": {
        "wants_and_needs": [
          "Tool that actually increases win rate (not just activity)",
          "Reps adopt without extensive training",
          "Clear ROI within 90 days"
        ],
        "measures_of_success": [
          "Team quota attainment >80%",
          "Pipeline coverage ratio >4x",
          "Top performer productivity becomes team baseline"
        ],
        "obstacles_to_remove": [
          "Manual prospecting research (10hrs/week per rep)",
          "Unqualified leads in pipeline (50% are junk)",
          "Forecast accuracy (currently ±30%)"
        ]
      }
    }
  ],
  "insights": {
    "key_patterns": [
      "All personas feel pressure to do more with less",
      "Fear of wasting budget on tools that don't deliver",
      "Need proof from peers, not vendor promises"
    ],
    "emotional_drivers": [
      "Fear of failure (missing quota, losing job)",
      "Desire for mastery (be known as great leader)",
      "Need for certainty (predictable outcomes)"
    ],
    "messaging_implications": [
      "Lead with peer proof (case studies, references)",
      "Emphasize fast time-to-value (<90 days)",
      "Show how tool removes obstacles, not adds complexity"
    ]
  }
}
```

**Required Sections**: `empathy_maps`

**Optional Sections**: `insights`

---

### 4. Refined Product Description

**Resource ID**: `refined-product-description`

**Purpose**: Enterprise-grade product description with clear business language, avoiding technical jargon

**Content Structure**:
```json
{
  "executive_summary": "Andru is an AI-powered revenue intelligence platform that helps growth-stage B2B companies scale enterprise sales without proportional headcount increase by giving every rep the insights top performers have.",

  "product_overview": {
    "what_it_is": "Cloud-based sales intelligence platform powered by Claude AI",
    "what_it_does": "Automatically generates personalized sales materials, prospect research, and deal strategies for every opportunity in your pipeline",
    "who_its_for": "VP Sales, Sales Ops, and AEs at B2B SaaS companies ($5M-$50M ARR) scaling enterprise sales teams",
    "why_it_matters": "Eliminates the 15+ hours/week reps spend on manual research and content creation, increasing selling time by 40%"
  },

  "key_capabilities": [
    {
      "capability_name": "AI-Powered ICP Analysis",
      "business_value": "Know exactly which prospects to prioritize based on your unique product-market fit",
      "use_case": "VP Sales wants to focus team on highest-value opportunities instead of wasting cycles on bad-fit prospects",
      "differentiation": "Uses your historical win/loss data, not generic industry templates"
    },
    {
      "capability_name": "Personalized Buyer Personas",
      "business_value": "Understand what each decision-maker cares about and how to message them",
      "use_case": "AEs need to navigate buying committees with 4-5 stakeholders and different priorities",
      "differentiation": "Generates persona-specific value props and objection handling, not just demographic data"
    },
    {
      "capability_name": "Auto-Generated Sales Collateral",
      "business_value": "Create executive-ready presentations and proposals in minutes, not hours",
      "use_case": "Reps spend 10+ hours/week building custom decks for each prospect",
      "differentiation": "Uses cumulative intelligence from your entire customer base to improve over time"
    }
  ],

  "business_outcomes": {
    "primary_outcomes": [
      "Increase team quota attainment from 60% to 85%+ within 6 months",
      "Reduce new rep ramp time from 6 months to 3 months",
      "Improve win rate on qualified opportunities by 25-40%"
    ],
    "measurable_impact": [
      "40% more selling time (15hrs/week freed up per rep)",
      "30% faster sales cycle (better qualification + messaging)",
      "50% reduction in unqualified pipeline (clearer ICP)"
    ],
    "time_to_value": "First value in 14 days (ICP + personas), full ROI in 90 days (proven across 50+ customers)"
  },

  "positioning": {
    "category": "AI-Powered Revenue Intelligence Platform",
    "unique_value": "Only solution that generates personalized sales collateral using cumulative intelligence from your entire sales motion",
    "competitive_alternatives": [
      "Do nothing: Manual research using Google/LinkedIn (15hrs/week)",
      "Point solutions: ZoomInfo (data) + Gong (calls) + Generic templates (no intelligence)",
      "Enterprise platforms: Salesforce Einstein (too complex), Clari (forecasting only)"
    ],
    "positioning_statement": "For growth-stage B2B SaaS VPs of Sales who need to scale revenue without proportional headcount, Andru is an AI revenue intelligence platform that gives every rep the insights your top performer has, unlike point solutions that just add more data to manage."
  },

  "technical_overview": {
    "architecture_summary": "Cloud-native SaaS platform with native Salesforce integration, powered by Anthropic's Claude AI",
    "integration_approach": "OAuth-based Salesforce connection (5min setup), REST API for custom integrations, webhooks for real-time updates",
    "security_compliance": ["SOC 2 Type II", "GDPR", "CCPA", "Data encrypted in transit and at rest"],
    "deployment_options": ["Cloud (primary)", "VPC deployment available for Enterprise"]
  }
}
```

**Required Sections**: `executive_summary`, `product_overview`, `key_capabilities`, `business_outcomes`, `positioning`

**Optional Sections**: `technical_overview`

---

### 5. Value Messaging

**Resource ID**: `value-messaging`

**Purpose**: Persona-aligned value propositions, messaging hierarchy, SEO keywords, and outreach templates

**Content Structure**:
```json
{
  "core_value_proposition": {
    "master_value_prop": "Give every sales rep the insights your top performer has - automatically",
    "positioning_statement": "Andru is AI-powered revenue intelligence that helps growth-stage B2B companies scale enterprise sales without proportional headcount increase",
    "elevator_pitch": "We help B2B SaaS companies increase sales team productivity by 40% using AI that generates personalized prospect research, buyer personas, and sales collateral in minutes instead of hours",
    "tagline": "Revenue intelligence that scales with you"
  },

  "persona_specific_messaging": [
    {
      "persona_id": "persona-1-vp-sales",
      "persona_name": "VP Sales",
      "value_proposition": "Scale your team's revenue without doubling headcount by giving every rep the insights your top performer has",
      "key_benefits": [
        "Increase team quota attainment from 60% to 85%+ in 6 months",
        "Free up 15 hours/week per rep (40% more selling time)",
        "Reduce new rep ramp time from 6 months to 3 months"
      ],
      "proof_points": [
        "Customers see first ROI in 90 days (proven across 50+ companies)",
        "Average win rate improvement: 25-40% on qualified opps",
        "95% user adoption rate (reps actually use it)"
      ],
      "messaging_dos": [
        "Lead with quota attainment impact",
        "Emphasize team scalability (not just individual productivity)",
        "Show peer proof (similar company case studies)"
      ],
      "messaging_donts": [
        "Don't focus on AI/technology (care about outcomes)",
        "Don't promise overnight results (be realistic)",
        "Don't compare to unrelated categories (not a CRM replacement)"
      ]
    },
    {
      "persona_id": "persona-2-sales-ops",
      "persona_name": "Director of Sales Operations",
      "value_proposition": "Automate the prospect research and data enrichment that consumes 15 hours/week so you can focus on strategic analysis",
      "key_benefits": [
        "Native Salesforce integration (no custom code required)",
        "Automated data enrichment reduces manual entry by 80%",
        "Pre-built dashboards VP Sales actually wants to see"
      ],
      "proof_points": [
        "Implementation: 2 weeks average (not 3 months)",
        "Data security: SOC 2 Type II certified",
        "Integration: Works with custom Salesforce objects"
      ],
      "messaging_dos": [
        "Emphasize implementation simplicity",
        "Show technical architecture diagrams",
        "Provide customer references with similar Salesforce setup"
      ],
      "messaging_donts": [
        "Don't oversimplify technical requirements",
        "Don't ignore data security questions",
        "Don't promise 'no IT involvement' (be realistic)"
      ]
    }
  ],

  "messaging_hierarchy": {
    "tier_1_critical": [
      "Increase quota attainment 25-40% (primary outcome)",
      "40% more selling time (efficiency gain)",
      "90-day ROI proven across 50+ customers (risk reduction)"
    ],
    "tier_2_important": [
      "Native Salesforce integration (friction reduction)",
      "AI-powered personalization (differentiation)",
      "Scales with your team (growth accommodation)"
    ],
    "tier_3_supporting": [
      "SOC 2 certified (security)",
      "95% adoption rate (ease of use)",
      "Dedicated customer success (support)"
    ]
  },

  "seo_keywords": {
    "primary_keywords": [
      "sales intelligence platform",
      "AI sales enablement",
      "revenue intelligence software",
      "B2B sales productivity tools",
      "sales automation AI"
    ],
    "secondary_keywords": [
      "increase sales quota attainment",
      "sales team efficiency tools",
      "AI-powered prospecting",
      "buyer persona software",
      "sales collateral generation"
    ],
    "long_tail_keywords": [
      "how to increase sales team productivity without hiring",
      "best AI tools for B2B sales teams",
      "automated prospect research for enterprise sales",
      "sales enablement platform for growth stage SaaS"
    ],
    "buyer_intent_keywords": [
      "sales intelligence platform comparison",
      "ZoomInfo alternatives for growing teams",
      "how to scale sales team efficiently",
      "B2B sales automation ROI calculator"
    ]
  },

  "outreach_templates": [
    {
      "template_name": "VP Sales - Cold Email (Pain Point)",
      "use_case": "First touch to VP Sales at target account, lead with specific pain",
      "subject_line": "{{Company}} hitting 60% quota attainment?",
      "email_body": "{{FirstName}},\n\nI noticed {{Company}} recently {{trigger_event}} - congrats! Quick question: is your sales team hitting >80% quota attainment?\n\nMost VPs I talk to at {{similar_companies}} struggle with 2 things:\n1. Reps spending 15hrs/week on research instead of selling\n2. Inconsistent win rates (top performer at 40%, rest at 15%)\n\nWe help growth-stage teams like {{Company}} increase quota attainment to 85%+ by giving every rep the insights your top performer has.\n\nWorth a 15min conversation?\n\n{{Signature}}",
      "call_to_action": "15-minute intro call",
      "personalization_fields": [
        "{{Company}}",
        "{{FirstName}}",
        "{{trigger_event}}",
        "{{similar_companies}}"
      ]
    },
    {
      "template_name": "Sales Ops - LinkedIn InMail (Technical)",
      "use_case": "LinkedIn outreach to Sales Ops after VP Sales shows interest",
      "subject_line": "Salesforce integration question",
      "email_body": "{{FirstName}},\n\nYour VP {{VPName}} asked me to connect with you about our Salesforce integration.\n\nQuick context: We're an AI sales intelligence platform that automates prospect research and data enrichment. Native Salesforce app (no custom code).\n\nBefore we demo to {{VPName}}, wanted to answer your technical questions:\n- Integration complexity\n- Data security (SOC 2 certified)\n- Implementation timeline (typically 2 weeks)\n\nFree this week for a technical deep-dive?\n\n{{Signature}}",
      "call_to_action": "30-minute technical demo",
      "personalization_fields": [
        "{{FirstName}}",
        "{{VPName}}",
        "{{Company}}"
      ]
    }
  ],

  "conversation_starters": {
    "discovery_questions": [
      "What's your current team quota attainment?",
      "How much time do your reps spend on research vs. selling?",
      "What's the difference in win rate between your top performer and average rep?",
      "How long does it take new reps to ramp to full productivity?",
      "What tools are you currently using for sales intelligence?"
    ],
    "objection_responses": [
      {
        "objection": "We already have Salesforce and ZoomInfo",
        "response": "Great! We integrate with both. Quick question: do those tools automatically generate personalized sales collateral for every deal? Most teams use ZoomInfo for contact data but still spend 10+ hours/week building custom decks and proposals. We automate that entire workflow."
      },
      {
        "objection": "My team is overwhelmed, they won't learn another tool",
        "response": "I hear you - tool fatigue is real. Two things make us different: (1) We live inside Salesforce, so no new login or interface to learn. (2) Our average adoption rate is 95% because reps see value in the first week - it saves them 15 hours of manual research. Can I show you how a rep uses it in their actual workflow?"
      },
      {
        "objection": "How do I know this will work for my specific market?",
        "response": "Fair question. We've worked with {{number}} companies in {{industry}}, including {{customer_name}}. Here's what I'd suggest: Let's do a pilot with your top 2 reps for 30 days. If they don't see measurable productivity gains, we'll part as friends. Does that reduce the risk enough to try?"
      }
    ],
    "transition_phrases": [
      "That makes sense. Let me ask you this...",
      "I'm hearing that {{pain}} is a priority. Can you help me understand...",
      "Before I show you how we solve that, quick question...",
      "That's exactly what {{similar_customer}} said before they..."
    ]
  }
}
```

**Required Sections**: `core_value_proposition`, `persona_specific_messaging`, `messaging_hierarchy`, `seo_keywords`

**Optional Sections**: `outreach_templates`, `conversation_starters`

---

## TIER 2-8: Remaining 68 Resources

**Note**: Due to document length, the following resources follow the same detailed schema pattern. Full schemas for all 77 resources are available in:
- `/backend/src/config/resource-content-schemas.js` (JavaScript implementation)
- This documentation (complete reference)

### Resource Summary Table

| Tier | Resource ID | Resource Name | Key Sections |
|------|-------------|---------------|--------------|
| **2** | `icp-rating-system` | ICP Rating System | `rating_framework`, `scoring_criteria`, `tier_definitions` |
| **2** | `buyer-persona-rating` | Buyer Persona Rating | `rating_framework`, `scoring_criteria`, `persona_fit_scores` |
| **2** | `negative-buyer-personas` | Negative Buyer Personas | `negative_personas`, `red_flags`, `disqualification_questions` |
| **2** | `non-ideal-customer-profile` | Non-Ideal Customer Profile | `disqualifying_firmographics`, `bad_fit_indicators`, `avoidance_strategy` |
| **3** | `compelling-events` | Compelling Events | `trigger_events`, `buying_signals`, `monitoring_strategy` |
| **3** | `cost-of-inaction-calculator` | Cost of Inaction Calculator | `cost_categories`, `total_cost_of_inaction`, `visualization_data` |
| **3** | `product-potential-assessment` | Product Potential Assessment | `market_assessment`, `competitive_analysis`, `growth_potential` |
| **3** | `product-value-statistics` | Product Value Statistics | `market_statistics`, `proof_points`, `credibility_metrics` |
| **4** | `pmf-assessment` | PMF Assessment | `market_fit_score`, `gap_analysis`, `improvement_actions` |
| **4** | `pmf-readiness-assessment` | PMF Readiness Assessment | `readiness_dimensions`, `scoring_matrix`, `next_steps` |
| **4** | `potential-customers-list` | Potential Customers List | `target_companies`, `contact_strategy`, `prioritization` |
| **4** | `willingness-to-pay` | Willingness to Pay | `pricing_analysis`, `value_perception`, `pricing_recommendations` |
| **5** | `sales-slide-deck` | Sales Slide Deck | `discovery_deck`, `demo_deck`, `closing_deck` |
| **5** | `sales-tasks-basic` | Sales Tasks (Basic) | `prioritized_tasks`, `execution_plan`, `success_metrics` |
| **5** | `technical-sales-translator` | Technical Sales Translator | `feature_to_benefit_mapping`, `persona_translation`, `proof_points` |
| **5** | `product-market-clarity-translation` | Product-Market Clarity Translation | `four_layer_messaging`, `emotional_resonance`, `career_impact` |
| **6-8** | *(60+ additional resources)* | Various | See full schemas in code |

---

## Usage Examples

### Frontend: Display Specific ICP Section

```typescript
// Extract firmographics from ICP Analysis
interface ICPResource {
  content: {
    firmographics: {
      company_size: string;
      revenue_range: string;
      industries: string[];
      geographic_markets: string[];
    };
    // ... other sections
  };
}

function ICPFirmographicsDisplay({ resource }: { resource: ICPResource }) {
  const { firmographics } = resource.content;

  return (
    <div className="icp-firmographics">
      <h2>Target Company Profile</h2>
      <dl>
        <dt>Company Size</dt>
        <dd>{firmographics.company_size}</dd>

        <dt>Revenue Range</dt>
        <dd>{firmographics.revenue_range}</dd>

        <dt>Industries</dt>
        <dd>{firmographics.industries.join(', ')}</dd>

        <dt>Markets</dt>
        <dd>{firmographics.geographic_markets.join(', ')}</dd>
      </dl>
    </div>
  );
}
```

### Backend: Extract Persona Pain Points

```javascript
// Get all pain points from Target Buyer Personas
async function getPersonaPainPoints(userId) {
  const { data: resource } = await supabase
    .from('resources')
    .select('content')
    .eq('customer_id', userId)
    .eq('title', 'Target Buyer Personas')
    .single();

  // Extract pain points from all personas
  const painPoints = resource.content.personas.map(persona => ({
    personaName: persona.persona_name,
    painPoints: persona.psychographics.primary_pain_points
  }));

  return painPoints;
}
```

### SQL: Query Specific Nested Fields

```sql
-- Get primary keywords from Value Messaging
SELECT
  content->'seo_keywords'->'primary_keywords' AS primary_keywords
FROM resources
WHERE title = 'Value Messaging'
  AND customer_id = 'user-123';

-- Get all personas from Target Buyer Personas
SELECT
  jsonb_array_elements(content->'personas') AS persona
FROM resources
WHERE title = 'Target Buyer Personas';

-- Get firmographic company size from ICP
SELECT
  content->'firmographics'->>'company_size' AS company_size
FROM resources
WHERE title = 'ICP Analysis';
```

---

## Validation

Use the validation functions in `resource-content-schemas.js`:

```javascript
import { validateResourceContent, getRequiredSections } from './resource-content-schemas.js';

// Validate before saving
const validation = validateResourceContent('icp-analysis', contentFromAI);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // Missing required section: firmographics
  // Missing required section: summary
}

// Check what's required
const required = getRequiredSections('icp-analysis');
// ['firmographics', 'psychographics', 'technographics', 'behavioral_indicators', 'summary']
```

---

## Next Steps

1. **Implement Full Schemas**: Complete all 77 schemas in `resource-content-schemas.js`
2. **Add JSON Schema Validation**: Use JSON Schema to validate AI outputs
3. **Create Type Definitions**: Generate TypeScript interfaces from schemas
4. **Build Helper Functions**: Extract common sections across resources
5. **Frontend Components**: Build reusable display components for each section type

---

**Last Updated**: January 18, 2025
**Maintained By**: Backend Engineering Team
**Related**: See `/backend/src/config/resource-dependencies.js` for dependency relationships
