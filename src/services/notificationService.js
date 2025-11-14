/**
 * Notification Service
 *
 * Handles sending email notifications to admin for important events:
 * - Assessment started (when user begins)
 * - Assessment completions (when user finishes)
 * - New waitlist signups
 *
 * Uses Resend for email delivery
 */

import { Resend } from 'resend';
import {
  newAssessmentEmailTemplate,
  newWaitlistEmailTemplate,
  assessmentStartedEmailTemplate
} from '../templates/admin-notifications.js';
import logger from '../utils/logger.js';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'geter@humusnshore.org';
// Use Resend's default onboarding domain (no verification needed)
// Once andru.ai domain is verified in Resend dashboard, change to 'notifications@andru.ai'
const FROM_EMAIL = 'onboarding@resend.dev';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://platform.andru-ai.com';

/**
 * Send notification for new assessment completion
 *
 * @param {Object} assessmentData - Assessment session data from database
 * @param {string} assessmentData.id - Assessment session ID
 * @param {string} assessmentData.user_email - User's email address
 * @param {string} assessmentData.company_name - Company name
 * @param {number} assessmentData.overall_score - Overall score (0-100)
 * @param {number} assessmentData.buyer_score - Buyer score (0-100)
 * @param {string} assessmentData.created_at - Timestamp
 */
export async function notifyNewAssessment(assessmentData) {
  try {
    logger.info('📧 Sending new assessment notification', {
      email: assessmentData.user_email,
      company: assessmentData.company_name
    });

    // Extract user name from email (or use email if no name)
    const userName = assessmentData.user_email.split('@')[0];

    // Prepare template data
    const templateData = {
      userName,
      userEmail: assessmentData.user_email,
      companyName: assessmentData.company_name,
      overallScore: assessmentData.overall_score || 0,
      buyerScore: assessmentData.buyer_score || 0,
      adminLink: `${FRONTEND_URL}/admin/founding-members?assessment=${assessmentData.id}`,
      timestamp: assessmentData.created_at
    };

    // Generate email content from template
    const emailContent = newAssessmentEmailTemplate(templateData);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    if (error) {
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }

    logger.info('✅ Assessment notification sent successfully', {
      emailId: data.id,
      to: ADMIN_EMAIL
    });

    return { success: true, emailId: data.id };

  } catch (error) {
    logger.error('❌ Failed to send assessment notification', {
      error: error.message,
      stack: error.stack,
      assessmentId: assessmentData.id
    });

    // Don't throw - we don't want to fail the webhook if email fails
    return { success: false, error: error.message };
  }
}

/**
 * Send notification for assessment started
 *
 * @param {Object} assessmentData - Assessment session data from database
 * @param {string} assessmentData.id - Assessment session ID
 * @param {string} assessmentData.session_id - Session identifier
 * @param {string} assessmentData.user_email - User's email address
 * @param {string} assessmentData.company_name - Company name (optional)
 * @param {string} assessmentData.current_step - Current step in assessment (optional)
 * @param {number} assessmentData.total_steps - Total number of steps (optional)
 * @param {number} assessmentData.completion_percentage - Progress percentage (optional)
 * @param {string} assessmentData.started_at - Timestamp when started
 */
export async function notifyAssessmentStarted(assessmentData) {
  try {
    logger.info('📧 Sending assessment started notification', {
      email: assessmentData.user_email,
      company: assessmentData.company_name,
      sessionId: assessmentData.session_id
    });

    // Prepare template data
    const templateData = {
      sessionId: assessmentData.session_id,
      userEmail: assessmentData.user_email,
      companyName: assessmentData.company_name,
      currentStep: assessmentData.current_step,
      totalSteps: assessmentData.total_steps,
      completionPercentage: assessmentData.completion_percentage,
      adminLink: `${FRONTEND_URL}/admin/founding-members?session=${assessmentData.session_id}`,
      timestamp: assessmentData.started_at
    };

    // Generate email content from template
    const emailContent = assessmentStartedEmailTemplate(templateData);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    if (error) {
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }

    logger.info('✅ Assessment started notification sent successfully', {
      emailId: data.id,
      to: ADMIN_EMAIL
    });

    return { success: true, emailId: data.id };

  } catch (error) {
    logger.error('❌ Failed to send assessment started notification', {
      error: error.message,
      stack: error.stack,
      sessionId: assessmentData.session_id
    });

    // Don't throw - we don't want to fail the webhook if email fails
    return { success: false, error: error.message };
  }
}

/**
 * Send notification for new waitlist signup
 *
 * @param {Object} signupData - Beta signup data from database
 * @param {string} signupData.id - Signup ID
 * @param {string} signupData.full_name - User's full name
 * @param {string} signupData.email - User's email address
 * @param {string} signupData.company - Company name
 * @param {string} signupData.job_title - Job title
 * @param {string} signupData.product_description - Product description
 * @param {string} signupData.referral_source - How they found us
 * @param {string} signupData.linkedin_profile - LinkedIn profile URL (optional)
 * @param {string} signupData.created_at - Timestamp
 */
export async function notifyNewWaitlistSignup(signupData) {
  try {
    logger.info('📧 Sending new waitlist signup notification', {
      name: signupData.full_name,
      email: signupData.email,
      company: signupData.company
    });

    // Prepare template data
    const templateData = {
      fullName: signupData.full_name,
      email: signupData.email,
      company: signupData.company,
      jobTitle: signupData.job_title,
      productDescription: signupData.product_description,
      referralSource: signupData.referral_source,
      linkedinProfile: signupData.linkedin_profile,
      adminLink: `${FRONTEND_URL}/admin/founding-members?email=${encodeURIComponent(signupData.email)}`,
      timestamp: signupData.created_at
    };

    // Generate email content from template
    const emailContent = newWaitlistEmailTemplate(templateData);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    if (error) {
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }

    logger.info('✅ Waitlist notification sent successfully', {
      emailId: data.id,
      to: ADMIN_EMAIL
    });

    return { success: true, emailId: data.id };

  } catch (error) {
    logger.error('❌ Failed to send waitlist notification', {
      error: error.message,
      stack: error.stack,
      signupId: signupData.id
    });

    // Don't throw - we don't want to fail the webhook if email fails
    return { success: false, error: error.message };
  }
}

/**
 * Test function to verify notification service is working
 * Sends a test email to admin
 */
export async function sendTestNotification() {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: '🧪 Test Notification - Andru Platform',
      html: '<h1>Test successful!</h1><p>Your notification service is working correctly.</p>',
      text: 'Test successful! Your notification service is working correctly.'
    });

    if (error) {
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }

    logger.info('✅ Test notification sent successfully', { emailId: data.id });
    return { success: true, emailId: data.id };

  } catch (error) {
    logger.error('❌ Test notification failed', { error: error.message });
    return { success: false, error: error.message };
  }
}
