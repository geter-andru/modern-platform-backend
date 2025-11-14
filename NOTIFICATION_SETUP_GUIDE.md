# Real-Time Email Notification Setup Guide

This guide explains how to set up real-time email notifications for new assessment completions and beta waitlist signups.

## Overview

When a user completes an assessment or signs up for the beta waitlist, you (geter@humusnshore.org) will receive an email notification within seconds.

**Architecture**:
```
User Action (Assessment/Signup)
    ↓
Supabase Database (INSERT)
    ↓
Database Trigger (PostgreSQL)
    ↓
Backend Webhook Endpoint (Express.js)
    ↓
Notification Service (Resend)
    ↓
Email Delivered (geter@humusnshore.org)
```

## Files Created/Modified

### Backend Files

1. **`.env`** - Added environment variables:
   ```bash
   RESEND_API_KEY=re_CJrrgmNo_LdLw6Ern4aEeAEXGxonxbVMj
   ADMIN_EMAIL=geter@humusnshore.org
   WEBHOOK_SECRET=n8xK2mP9vL4qR7wE1zF5jT6hY3sB0cA8
   ```

2. **`src/templates/admin-notifications.js`** - Email templates with brand styling

3. **`src/services/notificationService.js`** - Email sending logic using Resend

4. **`src/routes/webhooks.js`** - Added three new endpoints:
   - `POST /api/webhooks/notifications/assessment` - Receives assessment notifications
   - `POST /api/webhooks/notifications/waitlist` - Receives waitlist notifications
   - `GET /api/webhooks/notifications/test` - Test endpoint

### Database Files

5. **`infra/supabase/migrations/20251114000001_create_notification_triggers.sql`** - Database triggers

## Setup Steps

### Step 1: Deploy Backend Changes

1. Ensure backend is running with latest code:
   ```bash
   cd backend
   npm install resend
   npm start
   ```

2. Verify environment variables are set in production:
   - On Render.com (or your hosting platform), add the environment variables from `.env`

### Step 2: Configure Supabase

You have two options for triggering the webhooks:

#### Option A: Database Webhooks (Recommended - Easier)

1. Go to Supabase Dashboard → Database → Webhooks
2. Create webhook for `assessment_sessions`:
   - **Table**: `assessment_sessions`
   - **Events**: `INSERT`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://your-backend.onrender.com/api/webhooks/notifications/assessment`
   - **HTTP Headers**:
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer n8xK2mP9vL4qR7wE1zF5jT6hY3sB0cA8"
     }
     ```

3. Create webhook for `beta_signups`:
   - **Table**: `beta_signups`
   - **Events**: `INSERT`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://your-backend.onrender.com/api/webhooks/notifications/waitlist`
   - **HTTP Headers**: Same as above

#### Option B: SQL Triggers (Advanced)

1. Enable `pg_net` extension in Supabase:
   - Go to Database → Extensions
   - Search for "pg_net"
   - Enable it

2. Run the migration:
   ```bash
   cd infra/supabase
   supabase db push
   ```

3. Configure webhook URL and secret via SQL:
   ```sql
   SELECT set_webhook_config(
     'https://your-backend.onrender.com/api/webhooks',
     'n8xK2mP9vL4qR7wE1zF5jT6hY3sB0cA8'
   );
   ```

### Step 3: Test the Setup

#### Test 1: Backend Webhook Endpoints

Test the webhook endpoints directly:

```bash
# Test the test endpoint (no auth required)
curl http://localhost:3001/api/webhooks/notifications/test

# Test assessment webhook
curl -X POST http://localhost:3001/api/webhooks/notifications/assessment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer n8xK2mP9vL4qR7wE1zF5jT6hY3sB0cA8" \
  -d '{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_email": "test@example.com",
    "company_name": "Test Company",
    "overall_score": 85,
    "buyer_score": 78,
    "created_at": "2025-11-14T12:00:00Z"
  }'

# Test waitlist webhook
curl -X POST http://localhost:3001/api/webhooks/notifications/waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer n8xK2mP9vL4qR7wE1zF5jT6hY3sB0cA8" \
  -d '{
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "full_name": "Test User",
    "email": "test@example.com",
    "company": "Test Company",
    "job_title": "Test Role",
    "product_description": "Test product description",
    "referral_source": "LinkedIn",
    "created_at": "2025-11-14T12:00:00Z"
  }'
```

After each test, check geter@humusnshore.org for the email.

#### Test 2: Database Triggers (if using Option B)

Run these SQL commands in Supabase SQL Editor:

```sql
-- Test assessment notification
SELECT test_assessment_notification('geter@humusnshore.org', 'Test Company');

-- Test waitlist notification
SELECT test_waitlist_notification('Test User', 'geter@humusnshore.org');
```

#### Test 3: End-to-End Flow

1. **Assessment Test**:
   - Go to your frontend
   - Complete an assessment as a test user
   - Check your email for notification

2. **Waitlist Test**:
   - Go to the beta signup page
   - Fill out the form
   - Check your email for notification

### Step 4: Monitor and Verify

1. **Check Backend Logs**:
   ```bash
   # If running locally
   npm start

   # On Render.com
   # View logs in Render dashboard
   ```

   Look for these log messages:
   - `📥 New assessment notification webhook received`
   - `📧 Sending new assessment notification`
   - `✅ Assessment notification sent successfully`

2. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Filter for webhook-related entries
   - Look for trigger executions and any errors

3. **Check Email Delivery**:
   - Log into Resend dashboard: https://resend.com/emails
   - View sent emails and their status
   - Check delivery metrics

## Troubleshooting

### Email Not Received

1. **Check Resend API Key**:
   ```bash
   # Verify in backend/.env
   echo $RESEND_API_KEY
   ```

2. **Check Resend Dashboard**:
   - Go to https://resend.com/emails
   - Verify email was sent
   - Check for any error messages

3. **Check Spam Folder**:
   - Emails from `notifications@andru.ai` might be filtered

### Webhook Not Triggered

1. **Verify Webhook Secret**:
   ```bash
   # Must match in both backend/.env and Supabase webhook config
   echo $WEBHOOK_SECRET
   ```

2. **Check Supabase Webhook Status** (if using Option A):
   - Go to Database → Webhooks
   - View webhook execution history
   - Check for failed requests

3. **Check pg_net Extension** (if using Option B):
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

4. **Check Trigger Functions**:
   ```sql
   -- View trigger status
   SELECT * FROM pg_trigger
   WHERE tgname IN ('trigger_notify_new_assessment', 'trigger_notify_new_waitlist_signup');
   ```

### Backend Errors

1. **Check Backend Health**:
   ```bash
   curl http://localhost:3001/api/webhooks/health
   ```

2. **View Error Logs**:
   ```bash
   # Look for notification-related errors
   grep "notification" backend/logs/*.log
   ```

3. **Verify Dependencies**:
   ```bash
   cd backend
   npm list resend
   ```

## Email Template Examples

### Assessment Notification Email

**Subject**: 🎯 New Assessment: Test Company - Score: 85/100

**Body** (HTML with gradient headers, score boxes, and admin link):
- User name and email
- Company name
- Overall score: 85/100
- Buyer score: 78/100
- Completion timestamp
- Link to admin panel to view details

### Waitlist Notification Email

**Subject**: 📋 New Waitlist Signup: Test User (Test Company)

**Body** (HTML with detailed information):
- Full name and email
- Company and job title
- Product description
- How they found us
- LinkedIn profile (if provided)
- Signup timestamp
- Link to admin panel

## Production Checklist

Before going live:

- [ ] Backend deployed with environment variables set
- [ ] Resend domain verified (andru.ai)
- [ ] Webhook endpoints tested and working
- [ ] Database triggers configured (Option A or B)
- [ ] End-to-end test completed successfully
- [ ] Email received at geter@humusnshore.org
- [ ] Monitoring set up (Sentry, Render logs, etc.)
- [ ] Webhook secret is secure and not committed to git
- [ ] Rate limits configured appropriately

## Cost Breakdown

**Resend (Email)**:
- Free tier: 3,000 emails/month
- Cost if exceeded: $0.001/email
- Expected monthly emails: ~10-50 (well within free tier)

**Supabase (Database Webhooks/Triggers)**:
- Included in all plans
- No additional cost for webhook requests

**Backend (Hosting)**:
- No change to current costs
- Minimal CPU/memory impact

**Total**: $0/month (assuming < 3,000 notifications/month)

## Future Enhancements

Potential additions for later:

1. **SMS Notifications** (via Twilio):
   - Add Twilio integration
   - Send SMS for high-value assessments
   - Cost: ~$0.0075/SMS

2. **Slack Notifications**:
   - Post to Slack channel
   - Better for team collaboration

3. **Notification Preferences**:
   - Admin dashboard to configure notification types
   - Email vs SMS toggle
   - Quiet hours setting

4. **Enhanced Email Templates**:
   - Include assessment preview/summary
   - Add more context about the user
   - Suggested follow-up actions

5. **Notification Analytics**:
   - Track notification delivery rates
   - Monitor response times
   - Dashboard for notification metrics

## Support

If you encounter any issues:

1. Check this guide's troubleshooting section
2. Review backend logs for error messages
3. Check Supabase webhook execution history
4. Verify Resend dashboard for email delivery status
5. Test individual components (webhook → email) separately

---

**Last Updated**: 2025-11-14
**Maintained By**: Development Team
**Email**: geter@humusnshore.org
