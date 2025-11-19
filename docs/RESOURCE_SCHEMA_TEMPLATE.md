# Resource Content Schema Template

**Purpose**: Use this template when creating new resource content schemas for resources not yet documented.

**Location**: Add new schemas to `/backend/src/config/resource-content-schemas.js`

---

## Template Structure

```javascript
'resource-id-here': {
  resourceId: 'resource-id-here',
  resourceName: 'Human Readable Name',
  description: 'What this resource contains and why it matters (1-2 sentences)',
  structure: {
    // Define the expected JSON structure here
    // Use nested objects for complex structures
    // Use arrays for lists
    // Use 'string', 'number', 'boolean' as type indicators

    section_name: {
      field_name: 'string',
      nested_field: {
        sub_field: 'string'
      },
      array_field: ['string'],
      optional_field: 'string' // Mark optional fields with comment
    },

    another_section: {
      // ... more structure
    }
  },
  requiredSections: ['section_name'], // Sections that MUST be present
  optionalSections: ['another_section'], // Sections that MAY be present
  exampleQuery: {
    sql: "SELECT content->'section_name' AS section FROM resources WHERE title = 'Resource Name'",
    javascript: "const section = resource.content.section_name"
  }
}
```

---

## Step-by-Step Guide

### Step 1: Identify Resource from Dependencies

Check `/backend/src/config/resource-dependencies.js` for resource metadata:

```javascript
'your-resource-id': {
  resourceId: 'your-resource-id',
  resourceName: 'Your Resource Name',
  tier: 3,
  category: 'core',
  requiredDependencies: ['dependency-1', 'dependency-2'],
  estimatedTokens: 1200,
  impactStatement: 'What this resource achieves...'
}
```

### Step 2: Understand the Resource Purpose

Ask yourself:
1. **What problem does this resource solve?** (Basis for `description`)
2. **What information must it contain?** (Basis for `requiredSections`)
3. **What information might it contain?** (Basis for `optionalSections`)
4. **What will users query for?** (Basis for `exampleQuery`)

### Step 3: Design the Structure

Look at similar resources for patterns:

**For scoring/rating resources** (like `icp-rating-system`):
```javascript
structure: {
  rating_framework: {
    scoring_methodology: 'string',
    tier_definitions: { ... }
  },
  scoring_criteria: [ ... ],
  implementation_guide: { ... }
}
```

**For persona/profile resources** (like `target-buyer-personas`):
```javascript
structure: {
  personas: [
    {
      persona_id: 'string',
      persona_name: 'string',
      demographics: { ... },
      psychographics: { ... },
      behavior: { ... }
    }
  ],
  summary: { ... }
}
```

**For strategic/analytical resources** (like `pmf-assessment`):
```javascript
structure: {
  assessment_score: 'number',
  analysis: {
    strengths: ['string'],
    gaps: ['string'],
    opportunities: ['string']
  },
  recommendations: [ ... ]
}
```

### Step 4: Define Required vs Optional

**Required Sections** = Must be present for resource to be valid
- Core data that defines the resource
- Information needed for primary use case
- Sections referenced by other resources

**Optional Sections** = Enhance resource but not strictly necessary
- Implementation guides
- Advanced analysis
- Contextual recommendations

### Step 5: Add Query Examples

Show how to extract common sections:

```javascript
exampleQuery: {
  sql: "SELECT content->'most_important_section' AS data FROM resources WHERE title = 'Resource Name'",
  javascript: "const data = resource.content.most_important_section"
}
```

---

## Real-World Example: Creating `compelling-events` Schema

### Step 1: Check Dependencies
```javascript
// From resource-dependencies.js
'compelling-events': {
  resourceId: 'compelling-events',
  resourceName: 'Compelling Events',
  tier: 3,
  requiredDependencies: ['product-description', 'target-buyer-personas', 'icp-analysis', 'empathy-maps'],
  impactStatement: 'Identifies specific triggers that make buyers urgently seek your solution'
}
```

### Step 2: Understand Purpose
- **Problem**: Sales teams don't know WHEN to engage prospects
- **Solution**: Identify trigger events that indicate buying urgency
- **Output**: List of events to monitor + how to detect them

### Step 3: Design Structure
```javascript
'compelling-events': {
  resourceId: 'compelling-events',
  resourceName: 'Compelling Events',
  description: 'Trigger events and buying signals that indicate prospect readiness to purchase',
  structure: {
    trigger_events: [
      {
        event_name: 'string', // e.g., "New VP Sales Hired"
        description: 'string',
        urgency_level: 'string', // "Critical", "High", "Medium"
        detection_methods: ['string'], // How to find this event
        typical_timeline: 'string', // "30-60 days after event"
        messaging_approach: 'string' // What to say
      }
    ],
    organizational_changes: {
      leadership_changes: ['string'],
      restructuring: ['string'],
      funding_events: ['string']
    },
    buying_signals: {
      early_stage_signals: ['string'], // Research phase
      mid_stage_signals: ['string'], // Evaluation phase
      late_stage_signals: ['string'] // Decision phase
    },
    monitoring_strategy: {
      data_sources: ['string'], // LinkedIn Sales Navigator, news, etc.
      alert_criteria: ['string'],
      response_playbook: ['string']
    }
  },
  requiredSections: ['trigger_events', 'buying_signals'],
  optionalSections: ['organizational_changes', 'monitoring_strategy'],
  exampleQuery: {
    sql: "SELECT content->'buying_signals'->'late_stage_signals' AS late_signals FROM resources WHERE title = 'Compelling Events'",
    javascript: "const lateSignals = resource.content.buying_signals.late_stage_signals"
  }
}
```

### Step 4: Validate Against Use Cases

**Primary Use Case**: "As a sales rep, I want to know which trigger events to monitor so I can engage at the right time"
- ✅ `trigger_events` section provides this
- ✅ `detection_methods` tells them how to find events

**Secondary Use Case**: "As sales ops, I want to automate event detection"
- ✅ `monitoring_strategy` section provides automation guidance
- ✅ `data_sources` lists what to monitor

---

## Common Patterns

### Pattern 1: Framework Resources (Scoring, Rating, Assessment)
```javascript
structure: {
  framework_definition: { ... },
  scoring_criteria: [ ... ],
  tier_definitions: { ... },
  implementation_guide: { ... }
}
```

### Pattern 2: Content Resources (Decks, Templates, Messaging)
```javascript
structure: {
  primary_content: { ... },
  variations: [ ... ],
  usage_guidelines: { ... },
  customization_options: { ... }
}
```

### Pattern 3: Analysis Resources (Assessments, Reports)
```javascript
structure: {
  executive_summary: 'string',
  detailed_analysis: { ... },
  recommendations: [ ... ],
  action_items: [ ... ]
}
```

### Pattern 4: List Resources (Companies, Contacts, Opportunities)
```javascript
structure: {
  items: [
    {
      id: 'string',
      details: { ... },
      reasoning: 'string',
      next_actions: ['string']
    }
  ],
  prioritization: { ... },
  summary: { ... }
}
```

---

## Validation Checklist

Before finalizing schema, verify:

- [ ] `resourceId` matches entry in `resource-dependencies.js`
- [ ] `description` clearly explains what's in the content
- [ ] `structure` defines all expected sections
- [ ] `requiredSections` includes only truly required fields
- [ ] `optionalSections` includes enhancement sections
- [ ] `exampleQuery` shows SQL and JavaScript extraction
- [ ] Schema follows existing patterns from Tier 1-2 resources
- [ ] Structure supports primary use cases
- [ ] Field names are clear and consistent with other resources

---

## Quick Reference: Type Indicators

Use these type indicators in structure definitions:

```javascript
{
  string_field: 'string',           // Plain text
  number_field: 'number',           // Numeric value
  boolean_field: 'boolean',         // true/false
  array_of_strings: ['string'],    // Array of strings
  array_of_objects: [               // Array of objects
    {
      field: 'string'
    }
  ],
  nested_object: {                  // Nested structure
    sub_field: 'string'
  }
}
```

**Comments for Clarity**:
```javascript
{
  urgency_level: 'string', // "Critical", "High", "Medium", "Low"
  company_size: 'string', // e.g., "50-200 employees"
  score: 'number', // 0-100 scale
}
```

---

## Adding Your Schema

1. **Open**: `/backend/src/config/resource-content-schemas.js`
2. **Find**: The appropriate tier section (or create new tier section)
3. **Add**: Your schema following the template above
4. **Update**: Export at bottom if needed
5. **Test**: Use `validateResourceContent()` function to test

```javascript
import { validateResourceContent } from './resource-content-schemas.js';

// Test your schema
const testContent = {
  trigger_events: [ /* ... */ ],
  buying_signals: { /* ... */ }
};

const result = validateResourceContent('compelling-events', testContent);
console.log(result); // { valid: true, errors: [], schema: { ... } }
```

---

## Next Steps After Creating Schema

1. **Update Documentation**: Add to `COMPLETE_RESOURCE_CONTENT_SCHEMAS.md`
2. **Create TypeScript Types**: Generate `.d.ts` if using TypeScript
3. **Update AI Prompts**: Structure Claude prompts to return JSON in this format
4. **Test with Real Output**: Validate actual AI output against schema
5. **Iterate**: Refine schema based on real-world AI generations

---

**Last Updated**: January 18, 2025
**Template Version**: 1.0
**Related Files**:
- `/backend/src/config/resource-content-schemas.js` - Schema definitions
- `/backend/src/config/resource-dependencies.js` - Resource metadata
- `/backend/docs/COMPLETE_RESOURCE_CONTENT_SCHEMAS.md` - Full documentation
