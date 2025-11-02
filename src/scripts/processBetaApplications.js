/**
 * Process Beta Applications Script
 *
 * Manually reviews beta signups and sends appropriate emails based on scoring
 *
 * Usage:
 *   node src/scripts/processBetaApplications.js
 *
 * This script:
 * 1. Fetches all pending beta signups from Supabase
 * 2. Applies scoring criteria (100 points total)
 * 3. Auto-approves 80-100 point applications
 * 4. Flags 60-79 point applications for manual review
 * 5. Waitlists 40-59 point applications
 * 6. Rejects <40 point applications
 * 7. Sends appropriate emails to each applicant
 */

import { createClient } from '@supabase/supabase-js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Scoring Criteria (100 points total)
 *
 * Job Title Fit (30 points):
 * - Founder/CEO/Co-Founder: 30
 * - VP/Director/Head of: 25
 * - Manager/Lead: 15
 * - Individual Contributor: 10
 * - Student/Other: 5
 *
 * Company Legitimacy (25 points):
 * - Real B2B SaaS company with website: 25
 * - Early-stage startup, minimal presence: 20
 * - LinkedIn profile exists but company unclear: 10
 * - Suspicious/spam indicators: 0
 *
 * Product Description Quality (25 points):
 * - Excellent: Clear B2B SaaS, specific use case: 25
 * - Good: Real product, some detail: 20
 * - Minimal: One sentence, vague: 10
 * - Spam: Generic/irrelevant: 0
 *
 * Referral Source (15 points):
 * - Personal referral/warm intro: 15
 * - ProductHunt/Twitter/LinkedIn: 12
 * - Google search/organic: 8
 * - Unknown: 5
 *
 * LinkedIn Profile (5 points bonus):
 * - Has profile URL: +5
 */

function calculateScore(application) {
  let score = 0;
  const breakdown = {};

  // 1. Job Title Fit (30 points)
  const jobTitle = application.job_title?.toLowerCase() || '';
  if (jobTitle.includes('founder') || jobTitle.includes('ceo') || jobTitle.includes('co-founder')) {
    breakdown.jobTitle = 30;
  } else if (jobTitle.includes('vp') || jobTitle.includes('director') || jobTitle.includes('head of')) {
    breakdown.jobTitle = 25;
  } else if (jobTitle.includes('manager') || jobTitle.includes('lead')) {
    breakdown.jobTitle = 15;
  } else if (jobTitle.includes('student') || jobTitle.includes('intern')) {
    breakdown.jobTitle = 5;
  } else {
    breakdown.jobTitle = 10; // Individual contributor
  }
  score += breakdown.jobTitle;

  // 2. Company Legitimacy (25 points)
  const company = application.company_name?.toLowerCase() || '';
  const spamIndicators = ['test', 'asdf', 'none', 'n/a', 'example.com'];
  const hasSpam = spamIndicators.some(indicator => company.includes(indicator));

  if (hasSpam) {
    breakdown.company = 0;
  } else if (company.length > 3 && !company.includes('.')) {
    breakdown.company = 25; // Real company name
  } else if (company.length > 0) {
    breakdown.company = 10; // Minimal info
  } else {
    breakdown.company = 0;
  }
  score += breakdown.company;

  // 3. Product Description Quality (25 points)
  const productDesc = application.product_description?.toLowerCase() || '';
  const productLength = productDesc.length;
  const hasB2BKeywords = productDesc.includes('saas') ||
                         productDesc.includes('b2b') ||
                         productDesc.includes('enterprise') ||
                         productDesc.includes('platform');

  if (productLength > 100 && hasB2BKeywords) {
    breakdown.product = 25;
  } else if (productLength > 50) {
    breakdown.product = 20;
  } else if (productLength > 20) {
    breakdown.product = 10;
  } else {
    breakdown.product = 0;
  }
  score += breakdown.product;

  // 4. Referral Source (15 points)
  const source = application.referral_source?.toLowerCase() || '';
  if (source.includes('personal') || source.includes('referral') || source.includes('friend')) {
    breakdown.source = 15;
  } else if (source.includes('producthunt') || source.includes('twitter') || source.includes('linkedin')) {
    breakdown.source = 12;
  } else if (source.includes('google') || source.includes('search')) {
    breakdown.source = 8;
  } else {
    breakdown.source = 5;
  }
  score += breakdown.source;

  // 5. LinkedIn Profile Bonus (5 points)
  if (application.linkedin_url && application.linkedin_url.includes('linkedin.com')) {
    breakdown.linkedin = 5;
    score += 5;
  } else {
    breakdown.linkedin = 0;
  }

  return { score, breakdown };
}

function getApprovalDecision(score) {
  if (score >= 80) return 'approved';
  if (score >= 60) return 'manual_review';
  if (score >= 40) return 'waitlist';
  return 'rejected';
}

async function processBetaApplications() {
  logger.info('Starting beta application processing...');

  try {
    // Fetch all pending applications
    const { data: applications, error } = await supabase
      .from('beta_signups')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching applications:', error);
      return;
    }

    if (!applications || applications.length === 0) {
      logger.info('No pending applications to process.');
      return;
    }

    logger.info(`Found ${applications.length} pending applications`);

    const results = {
      approved: 0,
      manual_review: 0,
      waitlist: 0,
      rejected: 0,
      errors: 0
    };

    // Process each application
    for (const app of applications) {
      try {
        const { score, breakdown } = calculateScore(app);
        const decision = getApprovalDecision(score);

        logger.info(`\n--- Processing Application ---`);
        logger.info(`Name: ${app.full_name}`);
        logger.info(`Email: ${app.email}`);
        logger.info(`Score: ${score}/100`);
        logger.info(`Breakdown:`, breakdown);
        logger.info(`Decision: ${decision}`);

        // Update application in database
        let newStatus = decision;
        if (decision === 'manual_review') {
          logger.info('⚠️ MANUAL REVIEW REQUIRED - Skipping email');
          newStatus = 'pending'; // Keep as pending for manual review
        } else {
          // Send appropriate email
          let emailResult;
          switch (decision) {
            case 'approved':
              emailResult = await emailService.sendBetaApprovalEmail(app.email, app.full_name);
              break;
            case 'waitlist':
              emailResult = await emailService.sendBetaWaitlistEmail(app.email, app.full_name);
              break;
            case 'rejected':
              emailResult = await emailService.sendBetaRejectionEmail(app.email, app.full_name);
              break;
          }

          if (emailResult.success) {
            logger.info(`✅ Email sent successfully`);
          } else {
            logger.error(`❌ Email failed: ${emailResult.error}`);
          }
        }

        // Update database
        const { error: updateError } = await supabase
          .from('beta_signups')
          .update({
            status: newStatus,
            score: score,
            score_breakdown: breakdown,
            processed_at: new Date().toISOString()
          })
          .eq('id', app.id);

        if (updateError) {
          logger.error(`Error updating application ${app.id}:`, updateError);
          results.errors++;
        } else {
          results[decision]++;
        }

      } catch (appError) {
        logger.error(`Error processing application ${app.id}:`, appError);
        results.errors++;
      }
    }

    // Summary
    logger.info('\n========== PROCESSING COMPLETE ==========');
    logger.info(`Total Processed: ${applications.length}`);
    logger.info(`Approved: ${results.approved}`);
    logger.info(`Manual Review: ${results.manual_review}`);
    logger.info(`Waitlist: ${results.waitlist}`);
    logger.info(`Rejected: ${results.rejected}`);
    logger.info(`Errors: ${results.errors}`);
    logger.info('=========================================\n');

  } catch (error) {
    logger.error('Fatal error in processBetaApplications:', error);
  }
}

// Run the script
processBetaApplications()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
