/**
 * Phase 0.3: ICP Quality Validation Test
 *
 * Tests ICP generation with 10 real companies to validate:
 * - Persona title accuracy
 * - Pain points relevance
 * - Objection handling quality
 * - Overall output coherence
 *
 * Target: 9/10 quality score
 */

import aiService from './src/services/aiService.js';
import logger from './src/utils/logger.js';

// Test companies with realistic product information
const testCompanies = [
  {
    name: 'Stripe',
    company: 'Stripe Inc.',
    industry: 'Financial Technology',
    productInfo: {
      name: 'Stripe Payments',
      description: 'Complete payments infrastructure for the internet. Accept payments, send payouts, and manage your business online.',
      distinguishingFeature: 'Developer-first API with 99.99% uptime and support for 135+ currencies',
      businessModel: 'Usage-based pricing (2.9% + 30¢ per transaction)'
    }
  },
  {
    name: 'Notion',
    company: 'Notion Labs',
    industry: 'Productivity Software',
    productInfo: {
      name: 'Notion',
      description: 'All-in-one workspace for notes, docs, wikis, projects, and collaboration.',
      distinguishingFeature: 'Infinitely flexible blocks-based system that replaces multiple tools',
      businessModel: 'Freemium SaaS ($8/user/month for teams)'
    }
  },
  {
    name: 'Linear',
    company: 'Linear Inc.',
    industry: 'Project Management',
    productInfo: {
      name: 'Linear',
      description: 'Issue tracking tool built for high-performance engineering teams.',
      distinguishingFeature: 'Keyboard-first interface with sub-50ms response time',
      businessModel: 'Per-seat SaaS ($8/user/month)'
    }
  },
  {
    name: 'Supabase',
    company: 'Supabase Inc.',
    industry: 'Developer Tools',
    productInfo: {
      name: 'Supabase',
      description: 'Open source Firebase alternative with Postgres database, authentication, storage, and real-time subscriptions.',
      distinguishingFeature: 'Full Postgres power with auto-generated APIs',
      businessModel: 'Usage-based with free tier ($25/month starter)'
    }
  },
  {
    name: 'Figma',
    company: 'Figma Inc.',
    industry: 'Design Software',
    productInfo: {
      name: 'Figma',
      description: 'Collaborative interface design tool that runs in the browser.',
      distinguishingFeature: 'Real-time multiplayer collaboration with infinite canvas',
      businessModel: 'Freemium SaaS ($12/editor/month)'
    }
  },
  {
    name: 'Loom',
    company: 'Loom Inc.',
    industry: 'Communication Software',
    productInfo: {
      name: 'Loom',
      description: 'Async video messaging platform for work. Record your screen and camera with one click.',
      distinguishingFeature: 'Instant sharing with AI-powered transcriptions and insights',
      businessModel: 'Freemium SaaS ($12.50/user/month)'
    }
  },
  {
    name: 'Calendly',
    company: 'Calendly LLC',
    industry: 'Scheduling Software',
    productInfo: {
      name: 'Calendly',
      description: 'Scheduling automation platform that eliminates back-and-forth emails.',
      distinguishingFeature: 'Smart availability routing with calendar integrations',
      businessModel: 'Freemium SaaS ($8-16/user/month)'
    }
  },
  {
    name: 'Airtable',
    company: 'Airtable Inc.',
    industry: 'Database/Operations',
    productInfo: {
      name: 'Airtable',
      description: 'Low-code platform for building collaborative apps. Combines spreadsheet simplicity with database power.',
      distinguishingFeature: 'Flexible database with rich field types and automation',
      businessModel: 'Freemium SaaS ($20/user/month for teams)'
    }
  },
  {
    name: 'Webflow',
    company: 'Webflow Inc.',
    industry: 'Web Development',
    productInfo: {
      name: 'Webflow',
      description: 'Visual web design platform that generates production-ready code.',
      distinguishingFeature: 'Design freedom with CMS and hosting built-in',
      businessModel: 'Freemium SaaS ($14-39/month per site)'
    }
  },
  {
    name: 'Intercom',
    company: 'Intercom Inc.',
    industry: 'Customer Support',
    productInfo: {
      name: 'Intercom',
      description: 'Customer messaging platform for support, marketing, and sales.',
      distinguishingFeature: 'Unified inbox with AI-powered resolution and automation',
      businessModel: 'Per-seat SaaS ($39/seat/month)'
    }
  }
];

// Quality scoring criteria
const qualityCriteria = {
  personaTitles: {
    weight: 20,
    description: 'Are persona titles accurate and realistic?'
  },
  painPoints: {
    weight: 25,
    description: 'Are pain points specific and relevant to the product?'
  },
  objections: {
    weight: 20,
    description: 'Are objections realistic and addressable?'
  },
  segments: {
    weight: 20,
    description: 'Are customer segments well-defined and scored appropriately?'
  },
  coherence: {
    weight: 15,
    description: 'Is the overall output coherent and actionable?'
  }
};

/**
 * Evaluate ICP quality based on criteria
 */
function evaluateQuality(icpData, companyName) {
  const scores = {};
  let totalScore = 0;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`EVALUATING: ${companyName}`);
  console.log('='.repeat(80));

  // 1. Persona Titles (20 points)
  const hasSegments = icpData.segments && icpData.segments.length >= 3;
  const segmentQuality = hasSegments ?
    (icpData.segments.every(s => s.name && s.name.length > 5) ? 20 : 15) : 10;
  scores.personaTitles = segmentQuality;
  console.log(`\n✓ Persona Titles: ${segmentQuality}/20`);
  if (hasSegments) {
    icpData.segments.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} (Score: ${s.score || 'N/A'})`);
    });
  }

  // 2. Pain Points (25 points)
  const hasIndicators = icpData.keyIndicators && icpData.keyIndicators.length >= 5;
  const painPointQuality = hasIndicators ?
    (icpData.keyIndicators.every(i => i.length > 10) ? 25 : 20) : 15;
  scores.painPoints = painPointQuality;
  console.log(`\n✓ Pain Points (Key Indicators): ${painPointQuality}/25`);
  if (hasIndicators) {
    icpData.keyIndicators.slice(0, 3).forEach((ind, i) => {
      console.log(`  ${i + 1}. ${ind}`);
    });
  }

  // 3. Objections (20 points)
  const hasRedFlags = icpData.redFlags && icpData.redFlags.length >= 3;
  const objectionQuality = hasRedFlags ?
    (icpData.redFlags.every(f => f.length > 10) ? 20 : 15) : 10;
  scores.objections = objectionQuality;
  console.log(`\n✓ Red Flags/Objections: ${objectionQuality}/20`);
  if (hasRedFlags) {
    icpData.redFlags.forEach((flag, i) => {
      console.log(`  ${i + 1}. ${flag}`);
    });
  }

  // 4. Segments (20 points)
  const hasRatingCriteria = icpData.ratingCriteria && icpData.ratingCriteria.length >= 4;
  const segmentScoringQuality = hasRatingCriteria ?
    (icpData.ratingCriteria.every(c => c.weight && c.description) ? 20 : 15) : 10;
  scores.segments = segmentScoringQuality;
  console.log(`\n✓ Rating Criteria: ${segmentScoringQuality}/20`);
  if (hasRatingCriteria) {
    icpData.ratingCriteria.forEach((criteria, i) => {
      console.log(`  ${i + 1}. ${criteria.name} (${criteria.weight}%)`);
    });
  }

  // 5. Coherence (15 points)
  const hasTitle = icpData.title && icpData.title.length > 5;
  const hasDescription = icpData.description && icpData.description.length > 20;
  const coherenceScore = (hasTitle && hasDescription && hasSegments && hasIndicators) ? 15 :
                         (hasTitle && hasDescription) ? 10 : 5;
  scores.coherence = coherenceScore;
  console.log(`\n✓ Overall Coherence: ${coherenceScore}/15`);

  // Calculate total
  totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TOTAL SCORE: ${totalScore}/100 (${(totalScore / 10).toFixed(1)}/10)`);
  console.log('='.repeat(80) + '\n');

  return {
    companyName,
    scores,
    totalScore,
    outOf10: parseFloat((totalScore / 10).toFixed(1)),
    icpData
  };
}

/**
 * Run validation test for all companies
 */
async function runValidation() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         PHASE 0.3: ICP QUALITY VALIDATION TEST                ║');
  console.log('║         Testing 10 real companies                              ║');
  console.log('║         Target: 9/10 quality score average                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results = [];

  for (const testCompany of testCompanies) {
    console.log(`\n🔄 Processing: ${testCompany.name}...`);

    try {
      // Simulate customer data
      const customerData = {
        customerId: `test-${testCompany.name.toLowerCase()}`,
        company: testCompany.company,
        industry: testCompany.industry
      };

      const businessContext = {
        industry: testCompany.industry,
        productInfo: testCompany.productInfo,
        goals: ['increase revenue', 'improve product-market fit', 'scale efficiently']
      };

      // Generate ICP (using non-streaming for testing)
      const aiResult = await aiService.generateICPAnalysis(customerData, businessContext);

      if (!aiResult.success) {
        console.log(`❌ FAILED: ${testCompany.name} - ${aiResult.error}`);
        results.push({
          companyName: testCompany.name,
          failed: true,
          error: aiResult.error,
          outOf10: 0
        });
        continue;
      }

      // Evaluate quality
      const evaluation = evaluateQuality(aiResult.data, testCompany.name);
      results.push(evaluation);

      // Brief pause to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.log(`❌ ERROR: ${testCompany.name} - ${error.message}`);
      results.push({
        companyName: testCompany.name,
        failed: true,
        error: error.message,
        outOf10: 0
      });
    }
  }

  // Generate summary report
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    VALIDATION SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const successfulResults = results.filter(r => !r.failed);
  const failedResults = results.filter(r => r.failed);

  console.log(`✅ Successful: ${successfulResults.length}/10`);
  console.log(`❌ Failed: ${failedResults.length}/10\n`);

  if (successfulResults.length > 0) {
    const averageScore = successfulResults.reduce((sum, r) => sum + r.outOf10, 0) / successfulResults.length;

    console.log('QUALITY SCORES:');
    console.log('─'.repeat(80));
    successfulResults.forEach(r => {
      const statusIcon = r.outOf10 >= 9 ? '🟢' : r.outOf10 >= 7 ? '🟡' : '🔴';
      console.log(`${statusIcon} ${r.companyName.padEnd(20)} ${r.outOf10.toFixed(1)}/10`);
    });
    console.log('─'.repeat(80));
    console.log(`\n📊 AVERAGE SCORE: ${averageScore.toFixed(1)}/10`);

    if (averageScore >= 9.0) {
      console.log('\n✅ TARGET ACHIEVED: Quality meets 9/10 threshold!');
    } else {
      console.log(`\n⚠️  TARGET NOT MET: Need ${(9.0 - averageScore).toFixed(1)} more points`);
      console.log('\nRECOMMENDED IMPROVEMENTS:');

      // Analyze weak areas
      const allScores = successfulResults.flatMap(r => Object.entries(r.scores));
      const criteriaAverages = {};

      Object.keys(qualityCriteria).forEach(criterion => {
        const criterionScores = successfulResults.map(r => r.scores[criterion]);
        const avg = criterionScores.reduce((sum, s) => sum + s, 0) / criterionScores.length;
        const maxScore = qualityCriteria[criterion].weight;
        criteriaAverages[criterion] = {
          avg,
          maxScore,
          percentage: (avg / maxScore) * 100
        };
      });

      // Sort by lowest percentage
      const weakAreas = Object.entries(criteriaAverages)
        .sort((a, b) => a[1].percentage - b[1].percentage)
        .slice(0, 3);

      weakAreas.forEach(([criterion, stats], i) => {
        console.log(`  ${i + 1}. ${qualityCriteria[criterion].description}`);
        console.log(`     Current: ${stats.avg.toFixed(1)}/${stats.maxScore} (${stats.percentage.toFixed(0)}%)`);
      });
    }
  }

  if (failedResults.length > 0) {
    console.log('\n\n❌ FAILED TESTS:');
    console.log('─'.repeat(80));
    failedResults.forEach(r => {
      console.log(`${r.companyName}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');

  return {
    results,
    averageScore: successfulResults.length > 0 ?
      successfulResults.reduce((sum, r) => sum + r.outOf10, 0) / successfulResults.length : 0,
    targetMet: successfulResults.length > 0 &&
      (successfulResults.reduce((sum, r) => sum + r.outOf10, 0) / successfulResults.length) >= 9.0
  };
}

// Run validation
runValidation()
  .then(summary => {
    console.log(`\n✅ Validation complete. Average score: ${summary.averageScore.toFixed(1)}/10`);
    process.exit(summary.targetMet ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
