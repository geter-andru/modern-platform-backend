/**
 * Admin Notification Email Templates
 *
 * Templates for notifying admin of important events:
 * - New assessment starts (when user begins)
 * - New assessment completions (when user finishes with scores)
 * - New waitlist signups
 */

/**
 * New Assessment Notification Email
 * Sent when someone completes the Andru assessment
 */
export function newAssessmentEmailTemplate(data) {
  const {
    userName,
    userEmail,
    companyName,
    overallScore,
    buyerScore,
    adminLink,
    timestamp
  } = data;

  return {
    subject: `🎯 New Assessment: ${companyName || 'Unknown Company'} - Score: ${overallScore}/100`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .detail-row {
              background: white;
              padding: 15px;
              margin: 10px 0;
              border-radius: 5px;
              border-left: 4px solid #667eea;
            }
            .detail-label {
              font-weight: 600;
              color: #667eea;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .detail-value {
              color: #333;
              font-size: 16px;
              margin-top: 5px;
            }
            .score-box {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              font-size: 18px;
              font-weight: bold;
              margin-right: 10px;
            }
            .cta-button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: 600;
              margin-top: 20px;
            }
            .cta-button:hover {
              background: #764ba2;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎯 New Assessment Completed</h1>
          </div>
          <div class="content">
            <div class="detail-row">
              <div class="detail-label">User Name</div>
              <div class="detail-value">${userName}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Email Address</div>
              <div class="detail-value">${userEmail}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Company</div>
              <div class="detail-value">${companyName || 'Not provided'}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Scores</div>
              <div class="detail-value">
                <span class="score-box">Overall: ${overallScore}/100</span>
                <span class="score-box">Buyer: ${buyerScore}/100</span>
              </div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Completed At</div>
              <div class="detail-value">${new Date(timestamp).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'short'
              })}</div>
            </div>

            <div style="text-align: center;">
              <a href="${adminLink}" class="cta-button">
                View in Admin Panel →
              </a>
            </div>
          </div>
          <div class="footer">
            <p>Automated notification from Andru Assessment Platform</p>
          </div>
        </body>
      </html>
    `,
    text: `
New Assessment Completed

User: ${userName}
Email: ${userEmail}
Company: ${companyName || 'Not provided'}
Overall Score: ${overallScore}/100
Buyer Score: ${buyerScore}/100
Completed: ${new Date(timestamp).toLocaleString()}

View in admin panel: ${adminLink}
    `.trim()
  };
}

/**
 * New Waitlist Signup Notification Email
 * Sent when someone joins the beta waitlist
 */
export function newWaitlistEmailTemplate(data) {
  const {
    fullName,
    email,
    company,
    jobTitle,
    productDescription,
    referralSource,
    linkedinProfile,
    adminLink,
    timestamp
  } = data;

  return {
    subject: `📋 New Waitlist Signup: ${fullName} (${company})`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .detail-row {
              background: white;
              padding: 15px;
              margin: 10px 0;
              border-radius: 5px;
              border-left: 4px solid #667eea;
            }
            .detail-label {
              font-weight: 600;
              color: #667eea;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .detail-value {
              color: #333;
              font-size: 16px;
              margin-top: 5px;
            }
            .cta-button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: 600;
              margin-top: 20px;
            }
            .cta-button:hover {
              background: #764ba2;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 New Beta Waitlist Signup</h1>
          </div>
          <div class="content">
            <div class="detail-row">
              <div class="detail-label">Full Name</div>
              <div class="detail-value">${fullName}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Email Address</div>
              <div class="detail-value">${email}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Company</div>
              <div class="detail-value">${company}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Job Title</div>
              <div class="detail-value">${jobTitle}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Product Description</div>
              <div class="detail-value">${productDescription}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">How They Found Us</div>
              <div class="detail-value">${referralSource}</div>
            </div>

            ${linkedinProfile ? `
            <div class="detail-row">
              <div class="detail-label">LinkedIn Profile</div>
              <div class="detail-value">
                <a href="${linkedinProfile}" target="_blank">${linkedinProfile}</a>
              </div>
            </div>
            ` : ''}

            <div class="detail-row">
              <div class="detail-label">Signed Up At</div>
              <div class="detail-value">${new Date(timestamp).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'short'
              })}</div>
            </div>

            <div style="text-align: center;">
              <a href="${adminLink}" class="cta-button">
                View in Admin Panel →
              </a>
            </div>
          </div>
          <div class="footer">
            <p>Automated notification from Andru Beta Waitlist</p>
          </div>
        </body>
      </html>
    `,
    text: `
New Beta Waitlist Signup

Name: ${fullName}
Email: ${email}
Company: ${company}
Job Title: ${jobTitle}
Product: ${productDescription}
Referral Source: ${referralSource}
${linkedinProfile ? `LinkedIn: ${linkedinProfile}` : ''}
Signed Up: ${new Date(timestamp).toLocaleString()}

View in admin panel: ${adminLink}
    `.trim()
  };
}

/**
 * Assessment Started Notification Email
 * Sent when someone begins taking the assessment
 */
export function assessmentStartedEmailTemplate(data) {
  const {
    sessionId,
    userEmail,
    companyName,
    currentStep,
    totalSteps,
    completionPercentage,
    adminLink,
    timestamp
  } = data;

  const progressText = completionPercentage != null
    ? `${completionPercentage}% complete`
    : 'Just started';

  const stepText = currentStep && totalSteps
    ? `Step: ${currentStep} (of ${totalSteps} total)`
    : currentStep
      ? `Current step: ${currentStep}`
      : 'Beginning assessment';

  return {
    subject: `🚀 Assessment Started: ${companyName || userEmail || `Session ${sessionId.substring(0, 8)}`}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .detail-row {
              background: white;
              padding: 15px;
              margin: 10px 0;
              border-radius: 5px;
              border-left: 4px solid #667eea;
            }
            .detail-label {
              font-weight: 600;
              color: #667eea;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .detail-value {
              color: #333;
              font-size: 16px;
              margin-top: 5px;
            }
            .cta-button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: 600;
              margin-top: 20px;
            }
            .cta-button:hover {
              background: #764ba2;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .status-indicator {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: #fef3c7;
              border: 1px solid #fbbf24;
              color: #92400e;
              padding: 8px 12px;
              border-radius: 5px;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .progress-bar {
              background: #e5e7eb;
              height: 8px;
              border-radius: 4px;
              overflow: hidden;
              margin-top: 8px;
            }
            .progress-fill {
              background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
              height: 100%;
              transition: width 0.3s ease;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚀 New Assessment Started</h1>
          </div>
          <div class="content">
            <div class="status-indicator">
              ⏳ In Progress - User is currently taking the assessment
            </div>

            ${userEmail ? `
            <div class="detail-row">
              <div class="detail-label">Email Address</div>
              <div class="detail-value">${userEmail}</div>
            </div>
            ` : ''}

            ${companyName ? `
            <div class="detail-row">
              <div class="detail-label">Company</div>
              <div class="detail-value">${companyName}</div>
            </div>
            ` : ''}

            ${completionPercentage != null ? `
            <div class="detail-row">
              <div class="detail-label">Progress</div>
              <div class="detail-value">
                ${progressText}
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${completionPercentage}%"></div>
                </div>
              </div>
            </div>
            ` : ''}

            ${currentStep ? `
            <div class="detail-row">
              <div class="detail-label">Current Progress</div>
              <div class="detail-value">${stepText}</div>
            </div>
            ` : ''}

            <div class="detail-row">
              <div class="detail-label">Session ID</div>
              <div class="detail-value">
                <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 13px;">${sessionId}</code>
              </div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Started At</div>
              <div class="detail-value">${new Date(timestamp).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'short'
              })}</div>
            </div>

            <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #fbbf24;">
              <div class="detail-label">What Happens Next</div>
              <div class="detail-value" style="font-size: 14px; color: #666;">
                You'll receive a completion notification when this user finishes the assessment with their final scores.
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${adminLink}" class="cta-button">
                Track Progress in Admin Panel →
              </a>
            </div>
          </div>
          <div class="footer">
            <p>Automated notification from Andru Assessment Platform</p>
          </div>
        </body>
      </html>
    `,
    text: `
New Assessment Started

Email: ${userEmail}
${companyName ? `Company: ${companyName}` : ''}
${completionPercentage != null ? `Progress: ${progressText}` : ''}
${currentStep ? stepText : ''}
Session ID: ${sessionId}
Started: ${new Date(timestamp).toLocaleString()}

Status: ⏳ In Progress - User is currently taking the assessment

What happens next: You'll receive a completion notification when this user finishes the assessment with their final scores.

Track progress in admin panel: ${adminLink}
    `.trim()
  };
}
