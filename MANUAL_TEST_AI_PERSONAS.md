# Manual Testing Guide - AI Persona API Endpoints
**Date:** 2025-10-27
**Purpose:** Surgical precision manual testing with real Supabase instance
**Prerequisites:** ANTHROPIC_API_KEY and Supabase credentials configured in .env

---

## Prerequisites Checklist

- [ ] Backend server running (`npm start` or `npm run dev`)
- [ ] Supabase instance accessible
- [ ] `buyer_personas` table exists in Supabase
- [ ] Supabase RLS policies enabled
- [ ] ANTHROPIC_API_KEY set in environment
- [ ] Valid Supabase JWT token available

---

## Test Setup

### 1. Get Supabase JWT Token

**Option A: From Frontend Login**
```javascript
// In browser console after logging in to frontend
console.log(supabase.auth.session()?.access_token)
```

**Option B: Using Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Click on a user
3. Copy the access token from the session details

**Option C: Create test user via Supabase CLI**
```bash
# Sign up a test user
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/signup' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test-persona@example.com",
    "password": "TestPassword123!"
  }'
```

Save the `access_token` from the response.

### 2. Set Environment Variables

```bash
export SUPABASE_JWT="<your-jwt-token>"
export BACKEND_URL="http://localhost:3000"  # Or your backend URL
```

---

## Manual Test Suite

### TEST GROUP 1: POST /api/ai/generate-personas - Input Validation

#### TEST 1.1: No authentication
```bash
curl -X POST "$BACKEND_URL/api/ai/generate-personas" \
  -H "Content-Type: application/json" \
  -d '{
    "companyContext": "Enterprise SaaS company building tools",
    "industry": "Technology"
  }'
```

**Expected:**
- Status: `401`
- Response: `{ "success": false, "error": "Missing or invalid authorization header" }`

**Result:** ✅ / ❌

---

#### TEST 1.2: Missing companyContext
```bash
curl -X POST "$BACKEND_URL/api/ai/generate-personas" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "Technology"
  }'
```

**Expected:**
- Status: `400`
- Response: `{ "success": false, "error": "Missing required fields", "details": { "companyContext": "Required" } }`

**Result:** ✅ / ❌

---

#### TEST 1.3: Missing industry
```bash
curl -X POST "$BACKEND_URL/api/ai/generate-personas" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "companyContext": "Enterprise SaaS company building tools"
  }'
```

**Expected:**
- Status: `400`
- Response: `{ "success": false, "error": "Missing required fields", "details": { "industry": "Required" } }`

**Result:** ✅ / ❌

---

#### TEST 1.4: companyContext too short (less than 10 chars)
```bash
curl -X POST "$BACKEND_URL/api/ai/generate-personas" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "companyContext": "SaaS",
    "industry": "Technology"
  }'
```

**Expected:**
- Status: `400`
- Response: `{ "success": false, "error": "companyContext must be at least 10 characters" }`

**Result:** ✅ / ❌

---

#### TEST 1.5: industry too short (less than 2 chars)
```bash
curl -X POST "$BACKEND_URL/api/ai/generate-personas" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "companyContext": "Enterprise SaaS company building tools",
    "industry": "T"
  }'
```

**Expected:**
- Status: `400`
- Response: `{ "success": false, "error": "industry must be at least 2 characters" }`

**Result:** ✅ / ❌

---

### TEST GROUP 2: POST /api/ai/generate-personas - Successful Generation

#### TEST 2.1: Valid request with all fields
```bash
curl -X POST "$BACKEND_URL/api/ai/generate-personas" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "companyContext": "Enterprise B2B SaaS company building marketing automation tools for mid-market companies. We focus on lead generation, nurturing, and conversion optimization.",
    "industry": "B2B SaaS",
    "targetMarket": "Mid-market companies (200-1000 employees) in North America"
  }' | jq
```

**Expected:**
- Status: `201`
- Response structure:
```json
{
  "success": true,
  "personas": [
    {
      "title": "VP of Marketing Operations",
      "level": "VP",
      "demographics": { ... },
      "psychographics": { ... },
      "buyingBehavior": { ... }
    }
  ],
  "savedId": "<uuid>",
  "metadata": {
    "personaCount": 3-5,
    "industry": "B2B SaaS",
    "generatedAt": "<timestamp>",
    "apiDuration": "<ms>"
  }
}
```

**Validation Checklist:**
- [ ] Status is 201
- [ ] `success` is true
- [ ] `personas` is array with 3-5 items
- [ ] Each persona has `title`, `level`, `demographics`, `psychographics`, `buyingBehavior`
- [ ] `savedId` is valid UUID
- [ ] `metadata.personaCount` matches `personas.length`
- [ ] `metadata.industry` matches request
- [ ] `metadata.generatedAt` is valid timestamp
- [ ] `metadata.apiDuration` is in milliseconds (e.g., "2341ms")

**Result:** ✅ / ❌

**Save the `savedId` for verification:**
```bash
export SAVED_ID="<savedId-from-response>"
```

---

#### TEST 2.2: Valid request without optional targetMarket
```bash
curl -X POST "$BACKEND_URL/api/ai/generate-personas" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "companyContext": "Fintech startup building payment processing solutions for e-commerce",
    "industry": "Financial Technology"
  }' | jq
```

**Expected:**
- Status: `201`
- Response has same structure as TEST 2.1
- `targetMarket` should be null or inferred by Claude

**Result:** ✅ / ❌

---

### TEST GROUP 3: GET /api/personas/current-user - Retrieval

#### TEST 3.1: No authentication
```bash
curl -X GET "$BACKEND_URL/api/personas/current-user"
```

**Expected:**
- Status: `401`
- Response: `{ "success": false, "error": "Missing or invalid authorization header" }`

**Result:** ✅ / ❌

---

#### TEST 3.2: Get all personas for authenticated user
```bash
curl -X GET "$BACKEND_URL/api/personas/current-user" \
  -H "Authorization: Bearer $SUPABASE_JWT" | jq
```

**Expected:**
- Status: `200`
- Response structure:
```json
{
  "success": true,
  "personas": [
    {
      "id": "<uuid>",
      "user_id": "<user-uuid>",
      "personas": [...],
      "company_context": "...",
      "industry": "...",
      "target_market": "...",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
  ],
  "metadata": {
    "count": 2,
    "mostRecent": "<timestamp>"
  }
}
```

**Validation Checklist:**
- [ ] Status is 200
- [ ] `success` is true
- [ ] `personas` is array
- [ ] `metadata.count` matches array length
- [ ] `metadata.mostRecent` matches first record's `created_at`
- [ ] Records are ordered by `created_at` DESC (most recent first)
- [ ] First record's `id` matches `$SAVED_ID` from TEST 2.1

**Result:** ✅ / ❌

---

### TEST GROUP 4: Database Verification

#### TEST 4.1: Verify data in Supabase
```sql
-- Run in Supabase SQL Editor
SELECT
  id,
  user_id,
  jsonb_array_length(personas) as persona_count,
  industry,
  created_at,
  updated_at
FROM buyer_personas
ORDER BY created_at DESC
LIMIT 5;
```

**Validation Checklist:**
- [ ] Records exist for test user
- [ ] `user_id` matches authenticated user's ID
- [ ] `persona_count` is between 3-5
- [ ] `created_at` and `updated_at` are equal (new record)
- [ ] `industry` matches request

**Result:** ✅ / ❌

---

#### TEST 4.2: Verify persona structure in database
```sql
-- Run in Supabase SQL Editor
SELECT
  id,
  personas->0 as first_persona,
  personas->0->'title' as persona_title,
  personas->0->'level' as persona_level
FROM buyer_personas
WHERE id = '<SAVED_ID>';
```

**Expected:**
- `first_persona` is full JSON object
- `persona_title` is string (e.g., "VP of Marketing Operations")
- `persona_level` is one of: "C-Suite", "VP", "Director", "Manager", "IC"

**Result:** ✅ / ❌

---

### TEST GROUP 5: RLS Policy Verification

#### TEST 5.1: Create second test user and verify isolation
```bash
# Sign up second user
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/signup' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test-persona-2@example.com",
    "password": "TestPassword123!"
  }'
```

Save the new access token:
```bash
export SUPABASE_JWT_USER2="<new-access-token>"
```

Generate personas for User 2:
```bash
curl -X POST "$BACKEND_URL/api/ai/generate-personas" \
  -H "Authorization: Bearer $SUPABASE_JWT_USER2" \
  -H "Content-Type: application/json" \
  -d '{
    "companyContext": "Healthcare startup building telemedicine platform",
    "industry": "Healthcare Technology"
  }' | jq
```

Now verify User 1 cannot see User 2's personas:
```bash
# User 1 retrieves their personas
curl -X GET "$BACKEND_URL/api/personas/current-user" \
  -H "Authorization: Bearer $SUPABASE_JWT" | jq '.personas | length'
```

**Expected:**
- User 1 should NOT see User 2's personas
- Count should only reflect User 1's records

**Result:** ✅ / ❌

---

### TEST GROUP 6: Rate Limiting

#### TEST 6.1: Verify generation rate limit (5 per hour)
```bash
# Send 6 requests rapidly
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST "$BACKEND_URL/api/ai/generate-personas" \
    -H "Authorization: Bearer $SUPABASE_JWT" \
    -H "Content-Type: application/json" \
    -d '{
      "companyContext": "Test company number '$i'",
      "industry": "Technology"
    }' -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

**Expected:**
- First 5 requests: Status `201` (or `200` if successful)
- 6th request: Status `429` (Rate limit exceeded)
- Response includes: `"error": "Rate limit exceeded"`, `"resetTime": "<timestamp>"`

**Result:** ✅ / ❌

---

#### TEST 6.2: Verify retrieval rate limit (30 per 15 min)
```bash
# This test is time-consuming, document the behavior
echo "Rate limit for GET /api/personas/current-user is 30 requests per 15 minutes"
```

**Expected:**
- After 30 requests within 15 minutes, next request should return 429

**Result:** ✅ / ❌ / ⏭️ (Skipped)

---

### TEST GROUP 7: Error Handling

#### TEST 7.1: Test with invalid Anthropic API key
```bash
# Temporarily set invalid API key on server
# Or mock this in development

# Expected behavior:
# - Status: 500
# - Error: "AI service authentication failed"
# - Message: "Server configuration error. Please contact support."
```

**Result:** ✅ / ❌ / ⏭️ (Requires server restart)

---

#### TEST 7.2: Test with malformed JSON
```bash
curl -X POST "$BACKEND_URL/api/ai/generate-personas" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "companyContext": "Test", "industry": '
```

**Expected:**
- Status: `400`
- Error related to JSON parsing

**Result:** ✅ / ❌

---

## Test Results Summary

| Test Group | Tests Passed | Tests Failed | Notes |
|------------|--------------|--------------|-------|
| Input Validation | __ / 5 | __ / 5 | |
| Successful Generation | __ / 2 | __ / 2 | |
| Retrieval | __ / 2 | __ / 2 | |
| Database Verification | __ / 2 | __ / 2 | |
| RLS Isolation | __ / 1 | __ / 1 | |
| Rate Limiting | __ / 2 | __ / 2 | |
| Error Handling | __ / 2 | __ / 2 | |
| **TOTAL** | **__ / 16** | **__ / 16** | |

---

## Common Issues & Troubleshooting

### Issue: 401 Unauthorized
**Possible causes:**
- JWT token expired
- Wrong token format
- Missing `Bearer` prefix

**Solution:**
```bash
# Verify token format
echo $SUPABASE_JWT | head -c 50
# Should start with: eyJ...

# Generate new token from Supabase
```

### Issue: 500 Internal Server Error
**Possible causes:**
- Anthropic API key not set
- Supabase credentials invalid
- Database connection failed

**Solution:**
```bash
# Check backend logs
tail -f backend/logs/combined.log

# Verify environment variables
env | grep -E '(ANTHROPIC|SUPABASE)'
```

### Issue: Rate limit reached during testing
**Solution:**
```bash
# Wait for rate limit window to reset
# OR restart backend server (clears in-memory rate limit)
```

---

## Final Verification Checklist

- [ ] All input validation tests passing
- [ ] Successful persona generation working
- [ ] Personas saved to database correctly
- [ ] User can retrieve their saved personas
- [ ] RLS policies isolating user data
- [ ] Rate limiting enforced properly
- [ ] Error handling graceful and informative
- [ ] API documentation updated
- [ ] Logs showing proper info/error messages

---

## Sign-off

**Tested by:** _______________
**Date:** _______________
**Environment:** Development / Staging / Production
**Overall Result:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

**Notes:**
