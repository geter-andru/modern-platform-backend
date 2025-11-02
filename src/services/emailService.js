/**
 * Email Service
 *
 * Handles sending transactional emails
 * Supports development mode (console logging) and production mode (SMTP/SendGrid)
 */

import logger from '../utils/logger.js';
import config from '../config/index.js';

class EmailService {
  constructor() {
    this.isDevelopment = config.server.nodeEnv !== 'production';
    this.fromEmail = process.env.EMAIL_FROM || 'beta@andru.ai';
    this.replyToEmail = process.env.EMAIL_REPLY_TO || 'founders@andru.ai';

    // TODO: Configure email provider (SendGrid, Resend, or SMTP)
    // See BETA_SIGNUP_MIGRATION_GUIDE.md for setup instructions
    this.emailProvider = null;

    if (this.isDevelopment) {
      logger.info('EmailService: Running in development mode (emails will be logged)');
    }
  }

  /**
   * Send beta signup confirmation email
   * @param {string} email - Recipient email address
   * @param {string} fullName - Recipient full name
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendBetaConfirmationEmail(email, fullName) {
    const subject = "You're on the Founding Members Waitlist! 🚀";
    const htmlBody = this._getBetaConfirmationHTML(fullName);
    const textBody = this._getBetaConfirmationText(fullName);

    return this._sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: textBody
    });
  }

  /**
   * Send beta approval email
   * @param {string} email - Recipient email address
   * @param {string} fullName - Recipient full name
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendBetaApprovalEmail(email, fullName) {
    const subject = "Welcome to Andru Beta! 🎉";
    const htmlBody = this._getBetaApprovalHTML(fullName);
    const textBody = this._getBetaApprovalText(fullName);

    return this._sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: textBody
    });
  }

  /**
   * Send beta waitlist email
   * @param {string} email - Recipient email address
   * @param {string} fullName - Recipient full name
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendBetaWaitlistEmail(email, fullName) {
    const subject = "You're on our Priority Waitlist";
    const htmlBody = this._getBetaWaitlistHTML(fullName);
    const textBody = this._getBetaWaitlistText(fullName);

    return this._sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: textBody
    });
  }

  /**
   * Send beta rejection email
   * @param {string} email - Recipient email address
   * @param {string} fullName - Recipient full name
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendBetaRejectionEmail(email, fullName) {
    const subject = "Update on Your Andru Application";
    const htmlBody = this._getBetaRejectionHTML(fullName);
    const textBody = this._getBetaRejectionText(fullName);

    return this._sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: textBody
    });
  }

  /**
   * Send Week 1 check-in email
   * @param {string} email - Recipient email address
   * @param {string} fullName - Recipient full name
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendWeek1CheckIn(email, fullName) {
    const subject = "How's your first week with Andru? 🚀";
    const htmlBody = this._getWeek1CheckInHTML(fullName);
    const textBody = this._getWeek1CheckInText(fullName);

    return this._sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: textBody
    });
  }

  /**
   * Send Week 2 NPS survey email
   * @param {string} email - Recipient email address
   * @param {string} fullName - Recipient full name
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendWeek2NPSSurvey(email, fullName) {
    const subject = "Quick question: Would you recommend Andru?";
    const htmlBody = this._getWeek2NPSSurveyHTML(fullName);
    const textBody = this._getWeek2NPSSurveyText(fullName);

    return this._sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: textBody
    });
  }

  /**
   * Send Week 4 wins sharing email
   * @param {string} email - Recipient email address
   * @param {string} fullName - Recipient full name
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendWeek4WinsSharing(email, fullName) {
    const subject = "Share your Andru wins! 🎉";
    const htmlBody = this._getWeek4WinsSharingHTML(fullName);
    const textBody = this._getWeek4WinsSharingText(fullName);

    return this._sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: textBody
    });
  }

  /**
   * Send Week 8 founding member offer email
   * @param {string} email - Recipient email address
   * @param {string} fullName - Recipient full name
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendWeek8FoundingOffer(email, fullName) {
    const subject = "Lock in your $149/month lifetime pricing 🔐";
    const htmlBody = this._getWeek8FoundingOfferHTML(fullName);
    const textBody = this._getWeek8FoundingOfferText(fullName);

    return this._sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: textBody
    });
  }

  /**
   * Internal method to send email
   * @private
   */
  async _sendEmail({ to, subject, html, text }) {
    try {
      // Development mode - log email instead of sending
      if (this.isDevelopment) {
        logger.info('\n========== EMAIL (Development Mode) ==========');
        logger.info(`To: ${to}`);
        logger.info(`From: ${this.fromEmail}`);
        logger.info(`Reply-To: ${this.replyToEmail}`);
        logger.info(`Subject: ${subject}`);
        logger.info('---');
        logger.info(text);
        logger.info('===============================================\n');

        return {
          success: true,
          messageId: `dev-${Date.now()}@localhost`
        };
      }

      // Production mode - send via email provider
      // TODO: Implement actual email sending
      // Example with SendGrid:
      /*
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to,
        from: this.fromEmail,
        replyTo: this.replyToEmail,
        subject,
        text,
        html
      };

      const [response] = await sgMail.send(msg);
      return {
        success: true,
        messageId: response.headers['x-message-id']
      };
      */

      // For now, log warning in production
      logger.warn('Email sending not configured in production. Email would be sent to:', to);
      logger.warn('Configure EMAIL_PROVIDER in environment variables. See BETA_SIGNUP_MIGRATION_GUIDE.md');

      return {
        success: false,
        error: 'Email provider not configured'
      };

    } catch (error) {
      logger.error('Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get beta confirmation email HTML template
   * @private
   */
  _getBetaConfirmationHTML(fullName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Andru Beta Waitlist</title>
</head>
<body style="font-family: 'Red Hat Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're on the list! 🚀</h1>
  </div>

  <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${fullName},</p>
    <p style="margin: 0 0 15px 0;">Thank you for applying to be one of our <strong>100 founding members</strong>!</p>
  </div>

  <h2 style="color: #1f2937; font-size: 20px; margin: 25px 0 15px 0;">What happens next:</h2>
  <ul style="padding-left: 20px; margin: 0 0 25px 0;">
    <li style="margin-bottom: 10px;">We'll review your application within <strong>48 hours</strong></li>
    <li style="margin-bottom: 10px;">Approved members will receive beta access details</li>
    <li style="margin-bottom: 10px;">Beta launches <strong>December 1, 2025</strong></li>
    <li style="margin-bottom: 10px;">You'll lock in <strong>$149/month lifetime pricing</strong> (50% off forever)</li>
  </ul>

  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; color: #1e40af;">
      <strong>💡 Pro tip:</strong> Add beta@andru.ai to your contacts so our emails don't end up in spam.
    </p>
  </div>

  <p style="margin: 25px 0 15px 0;">Questions? Just reply to this email anytime.</p>

  <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p style="margin: 5px 0;">— Andru Team</p>
    <p style="margin: 5px 0;"><a href="https://andru.ai" style="color: #3b82f6; text-decoration: none;">andru.ai</a></p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get beta confirmation email plain text template
   * @private
   */
  _getBetaConfirmationText(fullName) {
    return `
Hi ${fullName},

Thank you for applying to be one of our 100 founding members!

What happens next:
• We'll review your application within 48 hours
• Approved members will receive beta access details
• Beta launches December 1, 2025
• You'll lock in $149/month lifetime pricing (50% off forever)

Questions? Reply to this email anytime.

— Andru Team
https://andru.ai
    `.trim();
  }

  /**
   * Get beta approval email HTML template
   * @private
   */
  _getBetaApprovalHTML(fullName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Andru Beta!</title>
</head>
<body style="font-family: 'Red Hat Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're In! 🎉</h1>
  </div>

  <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${fullName},</p>
    <p style="margin: 0 0 15px 0;">Congratulations! You've been approved as a <strong>founding member</strong> of Andru.</p>
  </div>

  <h2 style="color: #1f2937; font-size: 20px; margin: 25px 0 15px 0;">Next Steps:</h2>
  <ol style="padding-left: 20px; margin: 0 0 25px 0;">
    <li style="margin-bottom: 10px;"><strong>Join Slack:</strong> <a href="[SLACK_INVITE_LINK]" style="color: #3b82f6;">Click here to join our private Slack channel</a></li>
    <li style="margin-bottom: 10px;"><strong>Create Account:</strong> <a href="https://andru.ai/signup" style="color: #3b82f6;">Sign up with this email</a></li>
    <li style="margin-bottom: 10px;"><strong>Beta Access:</strong> Full access begins December 1, 2025</li>
  </ol>

  <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0; font-weight: 600; color: #065f46;">Your Founding Member Benefits:</p>
    <ul style="margin: 0; padding-left: 20px; color: #047857;">
      <li>Full access to ICP tool (Dec 2025 - Feb 2025)</li>
      <li>All export formats (PDF, Markdown, CSV)</li>
      <li>Direct Slack channel with founders</li>
      <li>Weekly feedback sessions</li>
      <li><strong>$149/month lifetime pricing</strong> (vs $297 for new users)</li>
      <li>No credit card required during beta</li>
    </ul>
  </div>

  <p style="margin: 25px 0 15px 0;">We can't wait to build this with you!</p>

  <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p style="margin: 5px 0;">— Andru Team</p>
    <p style="margin: 5px 0;"><a href="https://andru.ai" style="color: #3b82f6; text-decoration: none;">andru.ai</a></p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get beta approval email plain text template
   * @private
   */
  _getBetaApprovalText(fullName) {
    return `
Hi ${fullName},

Congratulations! You've been approved as a founding member of Andru.

Next Steps:
1. Join Slack: [SLACK_INVITE_LINK]
2. Create Account: https://andru.ai/signup
3. Beta Access: Full access begins December 1, 2025

Your Founding Member Benefits:
• Full access to ICP tool (Dec 2025 - Feb 2025)
• All export formats (PDF, Markdown, CSV)
• Direct Slack channel with founders
• Weekly feedback sessions
• $149/month lifetime pricing (vs $297 for new users)
• No credit card required during beta

We can't wait to build this with you!

— Andru Team
https://andru.ai
    `.trim();
  }

  /**
   * Get beta waitlist email HTML template
   * @private
   */
  _getBetaWaitlistHTML(fullName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on our Priority Waitlist</title>
</head>
<body style="font-family: 'Red Hat Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #3b82f6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're on our Priority Waitlist</h1>
  </div>

  <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${fullName},</p>
    <p style="margin: 0 0 15px 0;">Thank you for your interest in Andru. All <strong>100 founding member spots</strong> for our free beta are currently filled.</p>
  </div>

  <h2 style="color: #1f2937; font-size: 20px; margin: 25px 0 15px 0;">What This Means for You:</h2>
  <ul style="padding-left: 20px; margin: 0 0 25px 0;">
    <li style="margin-bottom: 10px;">You're on our <strong>priority waitlist</strong></li>
    <li style="margin-bottom: 10px;">You'll get early access if a spot opens during beta (Dec-Feb 2025)</li>
    <li style="margin-bottom: 10px;">You'll be <strong>first to know</strong> when we launch publicly in March 2025</li>
    <li style="margin-bottom: 10px;">We'll send you exclusive early-bird pricing before general launch</li>
  </ul>

  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; color: #92400e;">
      <strong>💡 Stay tuned:</strong> We're building something special with our beta users. You'll be among the first to experience the full platform in March.
    </p>
  </div>

  <p style="margin: 25px 0 15px 0;">Questions? Reply to this email anytime.</p>

  <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p style="margin: 5px 0;">— Andru Team</p>
    <p style="margin: 5px 0;"><a href="https://andru.ai" style="color: #3b82f6; text-decoration: none;">andru.ai</a></p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get beta waitlist email plain text template
   * @private
   */
  _getBetaWaitlistText(fullName) {
    return `
Hi ${fullName},

Thank you for your interest in Andru. All 100 founding member spots for our free beta are currently filled.

What This Means for You:
• You're on our priority waitlist
• You'll get early access if a spot opens during beta (Dec-Feb 2025)
• You'll be first to know when we launch publicly in March 2025
• We'll send you exclusive early-bird pricing before general launch

Questions? Reply to this email anytime.

— Andru Team
https://andru.ai
    `.trim();
  }

  /**
   * Get beta rejection email HTML template
   * @private
   */
  _getBetaRejectionHTML(fullName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update on Your Andru Application</title>
</head>
<body style="font-family: 'Red Hat Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6b7280 0%, #3b82f6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Update on Your Application</h1>
  </div>

  <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${fullName},</p>
    <p style="margin: 0 0 15px 0;">Thank you for your interest in Andru's founding member program. After careful review, we've decided to move forward with other candidates for our <strong>100 founding member spots</strong>.</p>
  </div>

  <h2 style="color: #1f2937; font-size: 20px; margin: 25px 0 15px 0;">We'd Still Love to Have You:</h2>
  <ul style="padding-left: 20px; margin: 0 0 25px 0;">
    <li style="margin-bottom: 10px;">We'll notify you when we <strong>launch publicly in March 2025</strong></li>
    <li style="margin-bottom: 10px;">Standard pricing will be <strong>$297/month</strong> with a 14-day free trial</li>
    <li style="margin-bottom: 10px;">You'll get full access to all platform features</li>
  </ul>

  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; color: #1e40af;">
      <strong>📬 Stay in touch:</strong> We'll send you an email when we launch publicly. Thank you for your interest in Andru!
    </p>
  </div>

  <p style="margin: 25px 0 15px 0;">Best of luck with your go-to-market efforts!</p>

  <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p style="margin: 5px 0;">— Andru Team</p>
    <p style="margin: 5px 0;"><a href="https://andru.ai" style="color: #3b82f6; text-decoration: none;">andru.ai</a></p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get beta rejection email plain text template
   * @private
   */
  _getBetaRejectionText(fullName) {
    return `
Hi ${fullName},

Thank you for your interest in Andru's founding member program. After careful review, we've decided to move forward with other candidates for our 100 founding member spots.

We'd Still Love to Have You:
• We'll notify you when we launch publicly in March 2025
• Standard pricing will be $297/month with a 14-day free trial
• You'll get full access to all platform features

Best of luck with your go-to-market efforts!

— Andru Team
https://andru.ai
    `.trim();
  }

  /**
   * Get Week 1 check-in email HTML template
   * @private
   */
  _getWeek1CheckInHTML(fullName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How's your first week?</title>
</head>
<body style="font-family: 'Red Hat Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">How's it going? 🚀</h1>
  </div>

  <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${fullName},</p>
    <p style="margin: 0 0 15px 0;">It's been a week since you joined Andru's beta! We'd love to hear how it's going.</p>
  </div>

  <h2 style="color: #1f2937; font-size: 20px; margin: 25px 0 15px 0;">Quick questions:</h2>
  <ul style="padding-left: 20px; margin: 0 0 25px 0;">
    <li style="margin-bottom: 10px;">Have you created your first ICP analysis?</li>
    <li style="margin-bottom: 10px;">Are the buyer personas accurate for your product?</li>
    <li style="margin-bottom: 10px;">Any features missing that would make this more valuable?</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://andru-slack-invite.com" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">Share Your Feedback in Slack</a>
  </div>

  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; color: #1e40af;">
      <strong>💡 Remember:</strong> You can reply to this email anytime, or jump into our Slack channel to chat with us directly!
    </p>
  </div>

  <p style="margin: 25px 0 15px 0;">Thanks for being a founding member!</p>

  <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p style="margin: 5px 0;">— Andru Team</p>
    <p style="margin: 5px 0;"><a href="https://andru.ai" style="color: #3b82f6; text-decoration: none;">andru.ai</a></p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get Week 1 check-in email plain text template
   * @private
   */
  _getWeek1CheckInText(fullName) {
    return `
Hi ${fullName},

It's been a week since you joined Andru's beta! We'd love to hear how it's going.

Quick questions:
• Have you created your first ICP analysis?
• Are the buyer personas accurate for your product?
• Any features missing that would make this more valuable?

Share your feedback in Slack: https://andru-slack-invite.com

Or just reply to this email!

Thanks for being a founding member!

— Andru Team
https://andru.ai
    `.trim();
  }

  /**
   * Get Week 2 NPS survey email HTML template
   * @private
   */
  _getWeek2NPSSurveyHTML(fullName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Would you recommend Andru?</title>
</head>
<body style="font-family: 'Red Hat Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Quick Survey (30 seconds)</h1>
  </div>

  <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${fullName},</p>
    <p style="margin: 0 0 15px 0;">You've been using Andru for 2 weeks now. We'd love your honest feedback!</p>
  </div>

  <h2 style="color: #1f2937; font-size: 20px; margin: 25px 0 15px 0; text-align: center;">On a scale of 0-10, how likely are you to recommend Andru?</h2>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://forms.google.com/andru-nps-survey" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px;">Take 30-Second Survey</a>
  </div>

  <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; color: #065f46;">
      <strong>🙏 Why this matters:</strong> Your feedback helps us build a product you'll love. We read every response personally!
    </p>
  </div>

  <p style="margin: 25px 0 15px 0;">Thank you for helping us improve!</p>

  <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p style="margin: 5px 0;">— Andru Team</p>
    <p style="margin: 5px 0;"><a href="https://andru.ai" style="color: #3b82f6; text-decoration: none;">andru.ai</a></p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get Week 2 NPS survey email plain text template
   * @private
   */
  _getWeek2NPSSurveyText(fullName) {
    return `
Hi ${fullName},

You've been using Andru for 2 weeks now. We'd love your honest feedback!

On a scale of 0-10, how likely are you to recommend Andru?

Take our 30-second survey: https://forms.google.com/andru-nps-survey

Your feedback helps us build a product you'll love. We read every response personally!

Thank you for helping us improve!

— Andru Team
https://andru.ai
    `.trim();
  }

  /**
   * Get Week 4 wins sharing email HTML template
   * @private
   */
  _getWeek4WinsSharingHTML(fullName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share your Andru wins!</title>
</head>
<body style="font-family: 'Red Hat Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Share Your Wins! 🎉</h1>
  </div>

  <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${fullName},</p>
    <p style="margin: 0 0 15px 0;">You've been using Andru for a month now! We'd love to hear about any wins or insights you've discovered.</p>
  </div>

  <h2 style="color: #1f2937; font-size: 20px; margin: 25px 0 15px 0;">What we'd love to know:</h2>
  <ul style="padding-left: 20px; margin: 0 0 25px 0;">
    <li style="margin-bottom: 10px;">Have you discovered new buyer personas you weren't targeting?</li>
    <li style="margin-bottom: 10px;">Has Andru helped refine your messaging or positioning?</li>
    <li style="margin-bottom: 10px;">Any specific features that have been game-changers?</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://andru-slack-invite.com" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #8b5cf6 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">Share in Slack</a>
  </div>

  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0; font-weight: 600; color: #92400e;">💡 Bonus:</p>
    <p style="margin: 0; font-size: 14px; color: #92400e;">
      If you're seeing great results, we'd love a testimonial! We'll feature founding members on our website when we launch publicly.
    </p>
  </div>

  <p style="margin: 25px 0 15px 0;">Can't wait to hear your story!</p>

  <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p style="margin: 5px 0;">— Andru Team</p>
    <p style="margin: 5px 0;"><a href="https://andru.ai" style="color: #3b82f6; text-decoration: none;">andru.ai</a></p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get Week 4 wins sharing email plain text template
   * @private
   */
  _getWeek4WinsSharingText(fullName) {
    return `
Hi ${fullName},

You've been using Andru for a month now! We'd love to hear about any wins or insights you've discovered.

What we'd love to know:
• Have you discovered new buyer personas you weren't targeting?
• Has Andru helped refine your messaging or positioning?
• Any specific features that have been game-changers?

Share in Slack: https://andru-slack-invite.com

Bonus: If you're seeing great results, we'd love a testimonial! We'll feature founding members on our website when we launch publicly.

Can't wait to hear your story!

— Andru Team
https://andru.ai
    `.trim();
  }

  /**
   * Get Week 8 founding offer email HTML template
   * @private
   */
  _getWeek8FoundingOfferHTML(fullName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lock in your lifetime pricing</title>
</head>
<body style="font-family: 'Red Hat Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Your Founding Member Offer 🔐</h1>
  </div>

  <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${fullName},</p>
    <p style="margin: 0 0 15px 0;">The beta period is winding down, and we're getting ready to launch publicly in <strong>March 2025</strong>.</p>
    <p style="margin: 0;">As a founding member, you have the opportunity to lock in <strong>$149/month lifetime pricing</strong> — that's <strong>50% off forever</strong> compared to our standard $297/month.</p>
  </div>

  <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
    <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 24px;">Founding Member Pricing</h2>
    <div style="font-size: 48px; font-weight: 700; color: #f59e0b; margin: 10px 0;">$149<span style="font-size: 24px; color: #92400e;">/month</span></div>
    <p style="margin: 10px 0 0 0; color: #92400e; font-weight: 600;">vs $297/month standard pricing</p>
    <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">Save $148/month = <strong>$1,776/year</strong></p>
  </div>

  <h2 style="color: #1f2937; font-size: 20px; margin: 25px 0 15px 0;">What You'll Keep:</h2>
  <ul style="padding-left: 20px; margin: 0 0 25px 0;">
    <li style="margin-bottom: 10px;">Full ICP analysis tool with AI-powered insights</li>
    <li style="margin-bottom: 10px;">Unlimited buyer personas & exports (PDF, Markdown, CSV)</li>
    <li style="margin-bottom: 10px;">Priority support (Slack access continues)</li>
    <li style="margin-bottom: 10px;">Early access to all new features (4 more modules coming in 2025)</li>
    <li style="margin-bottom: 10px;"><strong>Lifetime founding pricing — locked in forever</strong></li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://andru.ai/founding-member-checkout" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: white; padding: 18px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px;">Lock In $149/Month Forever</a>
  </div>

  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; color: #1e40af;">
      <strong>⏰ Founding member pricing closes February 28, 2025.</strong> After that, standard pricing ($297/mo) applies for all new signups.
    </p>
  </div>

  <p style="margin: 25px 0 15px 0;">Questions? Reply to this email or jump into Slack anytime.</p>

  <p style="margin: 25px 0 15px 0;">Thank you for being a founding member and helping us build Andru!</p>

  <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p style="margin: 5px 0;">— Andru Team</p>
    <p style="margin: 5px 0;"><a href="https://andru.ai" style="color: #3b82f6; text-decoration: none;">andru.ai</a></p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get Week 8 founding offer email plain text template
   * @private
   */
  _getWeek8FoundingOfferText(fullName) {
    return `
Hi ${fullName},

The beta period is winding down, and we're getting ready to launch publicly in March 2025.

As a founding member, you have the opportunity to lock in $149/month lifetime pricing — that's 50% off forever compared to our standard $297/month.

FOUNDING MEMBER PRICING
$149/month (vs $297/month standard)
Save $148/month = $1,776/year

What You'll Keep:
• Full ICP analysis tool with AI-powered insights
• Unlimited buyer personas & exports (PDF, Markdown, CSV)
• Priority support (Slack access continues)
• Early access to all new features (4 more modules coming in 2025)
• Lifetime founding pricing — locked in forever

Lock in $149/month forever: https://andru.ai/founding-member-checkout

⏰ Founding member pricing closes February 28, 2025. After that, standard pricing ($297/mo) applies for all new signups.

Questions? Reply to this email or jump into Slack anytime.

Thank you for being a founding member and helping us build Andru!

— Andru Team
https://andru.ai
    `.trim();
  }
}

// Export singleton instance
export default new EmailService();
