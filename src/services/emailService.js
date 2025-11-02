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
}

// Export singleton instance
export default new EmailService();
