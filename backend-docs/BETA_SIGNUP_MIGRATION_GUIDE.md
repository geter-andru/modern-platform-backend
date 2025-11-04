# Beta Signup Migration Guide

## Overview
This guide explains how to apply the beta_signups table migration to your Supabase database.

## Migration File
**Location:** `infra/supabase/migrations/20251101000001_create_beta_signups_table.sql`

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `20251101000001_create_beta_signups_table.sql`
6. Click **Run** or press `Ctrl+Enter`
7. Verify the table was created by running: `SELECT * FROM beta_signups LIMIT 1;`

### Option 2: Supabase CLI
If you have the Supabase CLI installed:
```bash
# Navigate to project root
cd /path/to/modern-platform

# Link to remote project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push
```

### Option 3: Direct SQL (psql)
If you have direct database access:
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f infra/supabase/migrations/20251101000001_create_beta_signups_table.sql
```

## Verification

After applying the migration, verify it worked:

### Test from backend:
```bash
cd backend
node scripts/test-beta-signup.js
```

### Expected output:
```
✓ Table exists with correct structure
✓ Current signups: 0
✓ Spots remaining: 100
✓ Test signup created successfully
✓ Test data cleaned up
✓ Duplicate email correctly prevented
✅ All tests completed successfully!
```

## Table Schema

The migration creates a `beta_signups` table with:

**Columns:**
- `id` - UUID primary key
- `full_name` - VARCHAR(100) NOT NULL
- `email` - VARCHAR(255) NOT NULL UNIQUE
- `company` - VARCHAR(100) NOT NULL
- `job_title` - VARCHAR(100) NOT NULL
- `product_description` - TEXT NOT NULL (20-500 chars)
- `referral_source` - VARCHAR(50) NOT NULL
- `linkedin_profile` - VARCHAR(255) NULLABLE
- `status` - VARCHAR(20) DEFAULT 'pending'
- `created_at` - TIMESTAMPTZ DEFAULT NOW()
- `updated_at` - TIMESTAMPTZ DEFAULT NOW()

**Indexes:**
- `idx_beta_signups_email` on email
- `idx_beta_signups_status` on status
- `idx_beta_signups_created_at` on created_at (DESC)

**Constraints:**
- Unique email
- Valid email format (regex check)
- Valid status ('pending', 'approved', 'rejected')
- Product description length (20-500 characters)
- LinkedIn profile must be valid URL if provided

## API Endpoints

Once migration is applied, these endpoints will be available:

### POST /api/beta-signup
Submit a beta signup application
- **Rate limit:** 3 requests per hour per IP
- **Auth:** None required (public endpoint)

**Request:**
```json
{
  "fullName": "Sarah Chen",
  "email": "sarah@acme.com",
  "company": "Acme Inc.",
  "jobTitle": "Head of Product",
  "productDescription": "We build project management software for remote teams...",
  "referralSource": "Twitter",
  "linkedinProfile": "https://linkedin.com/in/sarahchen"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "signupId": "beta_signup_abc123",
  "spotsRemaining": 87
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "This email has already applied",
  "field": "email"
}
```

### GET /api/beta-signup/spots-remaining
Get remaining beta spots
- **Rate limit:** Default (100 requests per 15 min)
- **Auth:** None required (public endpoint)

**Response:**
```json
{
  "success": true,
  "data": {
    "spotsRemaining": 87,
    "totalSpots": 100
  }
}
```

## Troubleshooting

### Error: "Table already exists"
If you see this error, the migration was already applied. You can skip to verification.

### Error: "Could not find the table 'public.beta_signups'"
The migration hasn't been applied yet. Follow one of the options above to apply it.

### Error: "permission denied for schema public"
You need to use a database user with CREATE TABLE permissions, or use the Supabase service role key.

## Next Steps

After the migration is applied:
1. ✅ Test the API endpoints using Postman or curl
2. ✅ Verify frontend can communicate with backend
3. ✅ Test rate limiting (try 4 submissions in 1 hour)
4. ✅ Configure email service for confirmation emails
5. ✅ Set up monitoring for beta signups

## Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Run the test script: `node backend/scripts/test-beta-signup.js`
3. Verify your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables
