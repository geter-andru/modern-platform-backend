/**
 * Beta Signup Controller
 *
 * Handles founding member beta signup applications
 * Reference: BETA_SIGNUP_PAGE_REQUIREMENTS.md
 */

import supabase from '../services/supabaseService.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

const betaSignupController = {
  /**
   * Submit beta signup application
   * POST /api/beta-signup
   */
  async submitBetaSignup(req, res) {
    try {
      const {
        fullName,
        email,
        company,
        jobTitle,
        productDescription,
        referralSource,
        linkedinProfile
      } = req.body;

      // Server-side validation
      const validationError = validateSignupData({
        fullName,
        email,
        company,
        jobTitle,
        productDescription,
        referralSource,
        linkedinProfile
      });

      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError.message,
          field: validationError.field
        });
      }

      // Check if email already exists
      const { data: existingSignup, error: checkError } = await supabase
        .from('beta_signups')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (checkError) {
        logger.error('Error checking for existing signup:', checkError);
        throw checkError;
      }

      if (existingSignup) {
        return res.status(400).json({
          success: false,
          error: 'This email has already applied',
          field: 'email'
        });
      }

      // Insert new signup
      const { data: newSignup, error: insertError } = await supabase
        .from('beta_signups')
        .insert([
          {
            full_name: fullName,
            email: email.toLowerCase(),
            company: company,
            job_title: jobTitle,
            product_description: productDescription,
            referral_source: referralSource,
            linkedin_profile: linkedinProfile || null,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (insertError) {
        logger.error('Error inserting beta signup:', insertError);
        throw insertError;
      }

      logger.info(`New beta signup: ${email} from ${company}`);

      // Get updated spots remaining
      const spotsRemaining = await getSpotsRemainingCount();

      // Send confirmation email (async, don't block response)
      emailService.sendBetaConfirmationEmail(email, fullName)
        .then(result => {
          if (result.success) {
            logger.info(`Confirmation email sent to ${email}`);
          } else {
            logger.warn(`Failed to send confirmation email to ${email}: ${result.error}`);
          }
        })
        .catch(err => {
          logger.error(`Error sending confirmation email to ${email}:`, err);
        });

      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        signupId: newSignup.id,
        spotsRemaining: spotsRemaining
      });
    } catch (error) {
      logger.error('Error submitting beta signup:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit application. Please try again.',
        timestamp: new Date().toISOString()
      });
    }
  },

  /**
   * Get spots remaining for beta
   * GET /api/beta-signup/spots-remaining
   */
  async getSpotsRemaining(req, res) {
    try {
      const spotsRemaining = await getSpotsRemainingCount();

      return res.status(200).json({
        success: true,
        data: {
          spotsRemaining: spotsRemaining,
          totalSpots: 100
        }
      });
    } catch (error) {
      logger.error('Error getting spots remaining:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get spots remaining',
        timestamp: new Date().toISOString()
      });
    }
  }
};

/**
 * Helper function to validate signup data
 */
function validateSignupData(data) {
  const {
    fullName,
    email,
    company,
    jobTitle,
    productDescription,
    referralSource,
    linkedinProfile
  } = data;

  // Full name validation
  if (!fullName || fullName.trim().length < 2) {
    return { message: 'Please enter your full name', field: 'fullName' };
  }
  if (fullName.length > 100) {
    return { message: 'Name is too long (max 100 characters)', field: 'fullName' };
  }

  // Email validation
  if (!email || !isValidEmail(email)) {
    return { message: 'Please enter a valid email address', field: 'email' };
  }

  // Check for disposable email domains (basic check)
  const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com'];
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (disposableDomains.includes(emailDomain)) {
    return { message: 'Please use a business email address', field: 'email' };
  }

  // Company validation
  if (!company || company.trim().length < 2) {
    return { message: 'Please enter your company name', field: 'company' };
  }
  if (company.length > 100) {
    return { message: 'Company name is too long (max 100 characters)', field: 'company' };
  }

  // Job title validation
  if (!jobTitle || jobTitle.trim().length < 2) {
    return { message: 'Please enter your job title', field: 'jobTitle' };
  }
  if (jobTitle.length > 100) {
    return { message: 'Job title is too long (max 100 characters)', field: 'jobTitle' };
  }

  // Product description validation
  if (!productDescription || productDescription.trim().length < 20) {
    return { message: 'Please provide at least 20 characters describing your product', field: 'productDescription' };
  }
  if (productDescription.length > 500) {
    return { message: 'Product description is too long (max 500 characters)', field: 'productDescription' };
  }

  // Referral source validation
  const validSources = ['Twitter', 'LinkedIn', 'ProductHunt', 'Referral from a friend', 'Google search', 'Other'];
  if (!referralSource || !validSources.includes(referralSource)) {
    return { message: 'Please select how you heard about us', field: 'referralSource' };
  }

  // LinkedIn profile validation (optional)
  if (linkedinProfile && linkedinProfile.trim().length > 0) {
    if (!isValidUrl(linkedinProfile)) {
      return { message: 'Please enter a valid LinkedIn URL', field: 'linkedinProfile' };
    }
  }

  return null; // No errors
}

/**
 * Helper function to validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper function to validate URL format
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

/**
 * Helper function to get spots remaining count
 */
async function getSpotsRemainingCount() {
  const { count, error } = await supabase
    .from('beta_signups')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'approved']);

  if (error) {
    logger.error('Error counting beta signups:', error);
    throw error;
  }

  return Math.max(0, 100 - (count || 0));
}

export default betaSignupController;
