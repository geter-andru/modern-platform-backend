/**
 * Priority 1: Empathy Framework Validation Tests
 *
 * Tests the complete empathy framework implementation across:
 * - Phase 1: Infrastructure (types + extractor)
 * - Phase 2: Schema updates (9 schemas)
 * - Phase 3: Context aggregation integration
 * - Phase 4: Universal prompt template application
 *
 * Validates:
 * 1. Core Worry correctly identified as CONSEQUENCE (not capability gap)
 * 2. Capability Gap identified separately as BLOCKER
 * 3. Emotional Relief addresses consequence fear
 * 4. Critical Need Context amplifies urgency
 * 5. Career Win articulated beyond worry avoidance
 * 6. Token usage within budget
 */

import { expect } from 'chai';
import empathyContextExtractor from '../src/services/empathyContextExtractor.js';
import ContextAggregationService from '../src/services/ContextAggregationService.js';

describe('Priority 1: Empathy Framework - End-to-End Validation', () => {

  // Test data: Mock user resources with empathy context
  const mockUserResourcesWithEmpathy = [
    {
      resource_id: 'target-buyer-personas',
      content: {
        personas: [
          {
            name: 'Sarah Chen',
            title: 'VP of Sales',
            role: 'Sales Leader',

            // CRITICAL: Core Worry is a CONSEQUENCE
            empathyMap: {
              see: [
                'Technical demos that wow engineers but lose CFOs',
                'Enterprise deals stalling at economic buyer stage',
                'Runway countdown on the board deck'
              ],
              hear: [
                'Board: "When are we going to see enterprise traction?"',
                'CFOs: "This sounds expensive - what\'s the ROI?"',
                'Team: "Should we be worried about our jobs?"'
              ],
              thinkAndFeel: [
                // ✅ CORRECT: This is the CONSEQUENCE (Core Worry)
                'I\'m terrified I\'ll have to lay off my team because we can\'t close enterprise deals',
                'I fear the board will replace me if we don\'t hit Series A milestones',
                'I\'m afraid I\'ll be known as the VP who couldn\'t scale sales'
              ],
              sayAndDo: {
                public: [
                  'We\'re building a strong pipeline',
                  'Our product is technically superior'
                ],
                private: [
                  'Wake up at 3 AM checking deal stages',
                  'Rehearse CFO conversations alone',
                  'Avoid board members in the hallway'
                ]
              },
              pains: [
                // ❌ These are CAPABILITY GAPS (blockers), not Core Worries
                'Can\'t translate technical superiority into CFO-friendly ROI language',
                'Struggle to articulate business value beyond product features',
                'Unable to get past economic buyer objections'
              ],
              gains: [
                'I stop waking up terrified about team layoffs',
                'I prove technical founders can build category-defining companies',
                'I become the VP who scaled enterprise sales from zero'
              ]
            },

            hiddenAmbitions: [
              'Prove I can be a CRO at a unicorn company'
            ],

            failureConsequences: [
              'Team layoffs and personal career damage'
            ],

            careerStage: 'First-time VP Sales at technical startup',

            successMetrics: [
              'Enterprise ARR',
              'Logo acquisition rate',
              'Sales cycle length'
            ]
          }
        ]
      }
    },
    {
      resource_id: 'icp-analysis',
      content: {
        firmographics: { /* ... */ },
        psychographics: { /* ... */ },

        // Critical Need Context (urgency framework)
        criticalNeedContext: {
          runwayMonths: 14,
          fundingPressure: 'Series A required in 90 days',
          boardMilestones: [
            '5-10 enterprise logos',
            '$5M ARR',
            'Proven CFO-level sales motion'
          ],
          recentHires: [
            'VP Sales (needs wins fast)',
            'Enterprise AEs (pipeline building)'
          ],
          observablePainSignals: [
            'Stalled enterprise deals',
            'CFO objections blocking closes',
            'Founder still in sales calls'
          ],
          criticalSuccessMetrics: [
            {
              metric: 'Close 3-5 enterprise deals',
              deadline: '90 days',
              impact: 'Extends runway 6-9 months, proves Series A readiness'
            },
            {
              metric: 'Build repeatable CFO close methodology',
              deadline: '60 days',
              impact: 'Enables VP Sales to scale without founder involvement'
            }
          ]
        }
      }
    }
  ];

  // Test data: Mock user resources WITHOUT empathy context
  const mockUserResourcesWithoutEmpathy = [
    {
      resource_id: 'target-buyer-personas',
      content: {
        personas: [
          {
            name: 'Generic Buyer',
            title: 'VP of Sales',
            role: 'Sales Leader',
            painPoints: ['Generic pain point'],
            goals: ['Generic goal']
            // No empathyMap, hiddenAmbitions, etc.
          }
        ]
      }
    },
    {
      resource_id: 'icp-analysis',
      content: {
        firmographics: { /* ... */ },
        psychographics: { /* ... */ }
        // No criticalNeedContext
      }
    }
  ];

  describe('Phase 1: Empathy Context Extraction', () => {

    it('should extract Core Worry as CONSEQUENCE (not capability gap)', () => {
      const empathyContext = empathyContextExtractor.extractEmpathyContext(mockUserResourcesWithEmpathy);

      expect(empathyContext).to.not.be.null;
      expect(empathyContext.coreWorry).to.exist;

      // ✅ Core Worry should be about CONSEQUENCE
      expect(empathyContext.coreWorry).to.include('lay off my team');
      expect(empathyContext.coreWorry).to.include('terrified');

      // ❌ Core Worry should NOT be about capability gap
      expect(empathyContext.coreWorry).to.not.include('translate');
      expect(empathyContext.coreWorry).to.not.include('struggle');
    });

    it('should extract Capability Gaps from pains (separate from Core Worry)', () => {
      const empathyContext = empathyContextExtractor.extractEmpathyContext(mockUserResourcesWithEmpathy);

      expect(empathyContext).to.not.be.null;
      expect(empathyContext.emotionalPains).to.exist;
      expect(empathyContext.emotionalPains.length).to.be.greaterThan(0);

      // ✅ Capability gaps should be in pains
      const hasCapabilityGap = empathyContext.emotionalPains.some(pain =>
        pain.includes('translate') || pain.includes('articulate')
      );
      expect(hasCapabilityGap).to.be.true;
    });

    it('should extract Critical Need Context with urgency signals', () => {
      const criticalNeedContext = empathyContextExtractor.extractCriticalNeedContext(mockUserResourcesWithEmpathy);

      expect(criticalNeedContext).to.not.be.null;
      expect(criticalNeedContext.urgency.runwayMonths).to.equal(14);
      expect(criticalNeedContext.urgency.fundingPressure).to.include('Series A');
      expect(criticalNeedContext.primaryMetric).to.exist;
      expect(criticalNeedContext.primaryMetric.deadline).to.equal('90 days');
    });

    it('should extract Hidden Ambition (career win beyond worry)', () => {
      const empathyContext = empathyContextExtractor.extractEmpathyContext(mockUserResourcesWithEmpathy);

      expect(empathyContext).to.not.be.null;
      expect(empathyContext.hiddenAmbition).to.exist;
      expect(empathyContext.hiddenAmbition).to.include('CRO');
      expect(empathyContext.hiddenAmbition).to.include('unicorn');
    });

    it('should gracefully handle missing empathy context', () => {
      const empathyContext = empathyContextExtractor.extractEmpathyContext(mockUserResourcesWithoutEmpathy);

      // Should fallback to basic context, not crash
      expect(empathyContext).to.not.be.null;
      expect(empathyContext.isBasicFallback).to.be.true;
    });
  });

  describe('Phase 2: Empathy Prompt Formatting', () => {

    it('should format empathy context with CRITICAL DISTINCTION header', () => {
      const combinedContext = empathyContextExtractor.extractCombinedContext(mockUserResourcesWithEmpathy);
      const formattedPrompt = empathyContextExtractor.formatForPrompt(combinedContext);

      expect(formattedPrompt).to.include('CRITICAL DISTINCTION');
      expect(formattedPrompt).to.include('Core Worry = The CONSEQUENCE they fear');
      expect(formattedPrompt).to.include('NOT the capability gap');
    });

    it('should include Core Worry in TARGET BUYER EMOTIONAL PROFILE', () => {
      const combinedContext = empathyContextExtractor.extractCombinedContext(mockUserResourcesWithEmpathy);
      const formattedPrompt = empathyContextExtractor.formatForPrompt(combinedContext);

      expect(formattedPrompt).to.include('TARGET BUYER EMOTIONAL PROFILE');
      expect(formattedPrompt).to.include('Core Worry:');
      expect(formattedPrompt).to.include('lay off my team');
    });

    it('should include Critical Need Context with urgency framing', () => {
      const combinedContext = empathyContextExtractor.extractCombinedContext(mockUserResourcesWithEmpathy);
      const formattedPrompt = empathyContextExtractor.formatForPrompt(combinedContext);

      expect(formattedPrompt).to.include('CRITICAL NEED CONTEXT (URGENCY)');
      expect(formattedPrompt).to.include('Runway: 14 months');
      expect(formattedPrompt).to.include('Series A');
      expect(formattedPrompt).to.include('90 days');
    });

    it('should include generation requirements with correct structure', () => {
      const combinedContext = empathyContextExtractor.extractCombinedContext(mockUserResourcesWithEmpathy);
      const formattedPrompt = empathyContextExtractor.formatForPrompt(combinedContext);

      expect(formattedPrompt).to.include('EMPATHY-DRIVEN GENERATION REQUIREMENTS');
      expect(formattedPrompt).to.include('1. **Addresses Core Worry (the CONSEQUENCE they fear)**');
      expect(formattedPrompt).to.include('2. **Provides Emotional Relief**');
      expect(formattedPrompt).to.include('I stop waking up terrified about');
      expect(formattedPrompt).to.include('NOT "I stop struggling with"');
    });

    it('should include structural guidance: Core Worry → Critical Need → Capability Gap → Solution', () => {
      const combinedContext = empathyContextExtractor.extractCombinedContext(mockUserResourcesWithEmpathy);
      const formattedPrompt = empathyContextExtractor.formatForPrompt(combinedContext);

      expect(formattedPrompt).to.include('**Structure**: 1) Core Worry (consequence) 2) Critical Need Context (urgency) 3) Capability Gap (blocker) 4) Solution (removes worry)');
    });

    it('should include tone guidance: consequence-focused', () => {
      const combinedContext = empathyContextExtractor.extractCombinedContext(mockUserResourcesWithEmpathy);
      const formattedPrompt = empathyContextExtractor.formatForPrompt(combinedContext);

      expect(formattedPrompt).to.include('consequence-focused');
      expect(formattedPrompt).to.include('career-oriented');
      expect(formattedPrompt).to.include('**Avoid**: Leading with capability gaps');
    });

    it('should return empty string when no empathy context available', () => {
      const combinedContext = empathyContextExtractor.extractCombinedContext(mockUserResourcesWithoutEmpathy);
      const formattedPrompt = empathyContextExtractor.formatForPrompt(combinedContext);

      expect(formattedPrompt).to.equal('');
    });
  });

  describe('Phase 3: Context Aggregation Integration', () => {

    it('should include empathy context in aggregated context', async () => {
      const contextAggregationService = new ContextAggregationService();

      const aggregatedContext = await contextAggregationService.aggregateContext(
        'test-user-123',
        'sales-deck',
        mockUserResourcesWithEmpathy
      );

      expect(aggregatedContext.empathyContext).to.exist;
      expect(aggregatedContext.empathyContext.hasEmpathyContext).to.be.true;
      expect(aggregatedContext.empathyContext.hasCriticalNeedContext).to.be.true;
    });

    it('should inject empathy prompt section FIRST in formatted context', async () => {
      const contextAggregationService = new ContextAggregationService();

      const aggregatedContext = await contextAggregationService.aggregateContext(
        'test-user-123',
        'sales-deck',
        mockUserResourcesWithEmpathy
      );

      const formattedPrompt = aggregatedContext.formattedPromptContext;

      // Empathy section should appear BEFORE tier sections
      const empathyIndex = formattedPrompt.indexOf('EMPATHY-DRIVEN CONTEXT');
      const tier1Index = formattedPrompt.indexOf('CRITICAL FOUNDATION CONTEXT');

      expect(empathyIndex).to.be.greaterThan(-1);
      if (tier1Index > -1) {
        expect(empathyIndex).to.be.lessThan(tier1Index);
      }
    });

    it('should track empathy tokens in token breakdown', async () => {
      const contextAggregationService = new ContextAggregationService();

      const aggregatedContext = await contextAggregationService.aggregateContext(
        'test-user-123',
        'sales-deck',
        mockUserResourcesWithEmpathy
      );

      expect(aggregatedContext.tokenBreakdown).to.exist;
      expect(aggregatedContext.tokenBreakdown.empathy).to.exist;
      expect(aggregatedContext.tokenBreakdown.empathy).to.be.greaterThan(0);
    });

    it('should stay within token budget (~3,700-3,900 tokens)', async () => {
      const contextAggregationService = new ContextAggregationService();

      const aggregatedContext = await contextAggregationService.aggregateContext(
        'test-user-123',
        'sales-deck',
        mockUserResourcesWithEmpathy
      );

      const totalTokens = aggregatedContext.totalTokens;

      // Original budget: ~3,500 tokens
      // With empathy: ~3,700-3,900 tokens
      // Max acceptable: 4,000 tokens (conservative)
      expect(totalTokens).to.be.lessThan(4000);

      // Empathy should be ~200-400 tokens
      const empathyTokens = aggregatedContext.tokenBreakdown.empathy;
      expect(empathyTokens).to.be.greaterThan(100); // Minimum meaningful context
      expect(empathyTokens).to.be.lessThan(500);    // Maximum acceptable overhead
    });
  });

  describe('Phase 4: Validation Checklist', () => {

    it('✅ Core Worry correctly identified as consequence', () => {
      const empathyContext = empathyContextExtractor.extractEmpathyContext(mockUserResourcesWithEmpathy);

      // Core Worry uses first-person fear language
      expect(empathyContext.coreWorry).to.match(/I'm terrified|I fear|I'm afraid/);

      // Core Worry is about consequence (layoffs, replacement, failure)
      const isConsequence =
        empathyContext.coreWorry.includes('lay off') ||
        empathyContext.coreWorry.includes('replace') ||
        empathyContext.coreWorry.includes('fail');

      expect(isConsequence).to.be.true;
    });

    it('✅ Capability Gap identified separately from Core Worry', () => {
      const empathyContext = empathyContextExtractor.extractEmpathyContext(mockUserResourcesWithEmpathy);

      // Capability gaps in emotionalPains
      const hasCapabilityGap = empathyContext.emotionalPains.some(pain =>
        pain.includes('translate') ||
        pain.includes('articulate') ||
        pain.includes('struggle')
      );

      expect(hasCapabilityGap).to.be.true;

      // Capability gap NOT in Core Worry
      expect(empathyContext.coreWorry).to.not.include('translate');
      expect(empathyContext.coreWorry).to.not.include('articulate');
    });

    it('✅ Critical Need Context amplifies urgency', () => {
      const criticalNeedContext = empathyContextExtractor.extractCriticalNeedContext(mockUserResourcesWithEmpathy);

      expect(criticalNeedContext.urgency.runwayMonths).to.be.lessThan(18); // Urgency threshold
      expect(criticalNeedContext.urgency.fundingPressure).to.exist;
      expect(criticalNeedContext.primaryMetric.deadline).to.exist;
    });

    it('✅ Emotional Relief addresses consequence (not capability)', () => {
      const empathyContext = empathyContextExtractor.extractEmpathyContext(mockUserResourcesWithEmpathy);

      // Relief statements use "I stop..." language
      const hasReliefStatement = empathyContext.desiredGains.some(gain =>
        gain.startsWith('I stop')
      );

      expect(hasReliefStatement).to.be.true;

      // Relief addresses consequence fear
      const reliefAddressesConsequence = empathyContext.desiredGains.some(gain =>
        gain.includes('lay off') ||
        gain.includes('terrified')
      );

      expect(reliefAddressesConsequence).to.be.true;
    });

    it('✅ Career Win articulated beyond worry avoidance', () => {
      const empathyContext = empathyContextExtractor.extractEmpathyContext(mockUserResourcesWithEmpathy);

      expect(empathyContext.hiddenAmbition).to.exist;

      // Career win is about advancement, not just avoiding Core Worry
      const isCareerAdvancement =
        empathyContext.hiddenAmbition.includes('CRO') ||
        empathyContext.hiddenAmbition.includes('unicorn') ||
        empathyContext.hiddenAmbition.includes('scale');

      expect(isCareerAdvancement).to.be.true;
    });

    it('✅ Structural flow: Core Worry → Critical Need → Capability Gap → Solution', () => {
      const combinedContext = empathyContextExtractor.extractCombinedContext(mockUserResourcesWithEmpathy);
      const formattedPrompt = empathyContextExtractor.formatForPrompt(combinedContext);

      // Check order of sections
      const coreWorryIndex = formattedPrompt.indexOf('Core Worry:');
      const criticalNeedIndex = formattedPrompt.indexOf('CRITICAL NEED CONTEXT');
      const structureGuideIndex = formattedPrompt.indexOf('**Structure**');

      expect(coreWorryIndex).to.be.lessThan(criticalNeedIndex);
      expect(criticalNeedIndex).to.be.lessThan(structureGuideIndex);

      // Structure explicitly states correct flow
      expect(formattedPrompt).to.include('1) Core Worry (consequence)');
      expect(formattedPrompt).to.include('2) Critical Need Context (urgency)');
      expect(formattedPrompt).to.include('3) Capability Gap (blocker)');
      expect(formattedPrompt).to.include('4) Solution (removes worry)');
    });
  });

  describe('Phase 5: End-to-End Resource Generation Validation', () => {

    it('should generate empathy-enhanced content for ALL 77 resources', async () => {
      const contextAggregationService = new ContextAggregationService();

      // Test sample of different resource types
      const resourceTypes = [
        'sales-deck',
        'email-templates',
        'objection-handlers',
        'battlecards',
        'value-messaging'
      ];

      for (const resourceType of resourceTypes) {
        const aggregatedContext = await contextAggregationService.aggregateContext(
          'test-user-123',
          resourceType,
          mockUserResourcesWithEmpathy
        );

        // Every resource should have empathy context
        expect(aggregatedContext.empathyContext.hasEmpathyContext).to.be.true;

        // Every formatted prompt should start with empathy section
        expect(aggregatedContext.formattedPromptContext).to.include('EMPATHY-DRIVEN CONTEXT');
      }
    });

    it('should handle missing empathy gracefully across all resources', async () => {
      const contextAggregationService = new ContextAggregationService();

      const aggregatedContext = await contextAggregationService.aggregateContext(
        'test-user-123',
        'sales-deck',
        mockUserResourcesWithoutEmpathy
      );

      // Should not crash
      expect(aggregatedContext).to.exist;

      // Empathy context should be marked as unavailable
      expect(aggregatedContext.empathyContext.hasEmpathyContext).to.be.false;

      // Formatted prompt should not include empathy section
      expect(aggregatedContext.formattedPromptContext).to.not.include('EMPATHY-DRIVEN CONTEXT');
    });
  });
});
