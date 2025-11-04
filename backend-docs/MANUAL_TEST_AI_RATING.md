# Manual Testing Guide: AI Rating Controller
**Phase 3, Chunk 3: Company ICP Fit Rating**
**Date:** 2025-10-27
**Status:** Ready for Testing
**Estimated Time:** 30-45 minutes

---

## Prerequisites

### 1. Environment Setup
- [ ] Backend server running: `cd backend && npm start`
- [ ] Server accessible at: `http://localhost:3000` (or your configured PORT)
- [ ] Environment variables configured:
  - [ ] `ANTHROPIC_API_KEY` set
  - [ ] `SUPABASE_URL` set
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` set
  - [ ] `NODE_ENV=development` (for detailed errors)

### 2. Database Requirements
- [ ] Supabase database accessible
- [ ] `icp_frameworks` table exists with at least one framework
- [ ] `company_ratings` table exists (run migration if needed)
- [ ] `buyer_personas` table exists
- [ ] `company_research` table exists (optional, for cached data)

### 3. Authentication Token
You need a valid Supabase JWT token for testing. Choose one method:

#### Method A: Via Supabase Dashboard
1. Go to Supabase Dashboard → Authentication → Users
2. Select a test user
3. Copy the JWT token from the user details

#### Method B: Via Frontend Login
1. Start frontend: `cd frontend && npm run dev`
2. Login at http://localhost:3001/auth
3. Open browser DevTools → Application → Local Storage
4. Copy value of `supabase.auth.token`

#### Method C: Create Test User via API
```bash
# Create test user (if needed)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

**Save your token as an environment variable:**
```bash
export JWT_TOKEN="your-jwt-token-here"
```

---

## Test Suite

### GROUP 1: Input Validation (5 tests)

#### Test 1.1: Reject Unauthenticated Request
**Objective:** Verify authentication is required

```bash
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -d '{
    "companyUrl": "https://example.com"
  }'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

#### Test 1.2: Reject Missing Company URL
**Objective:** Verify companyUrl is required

```bash
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{}'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Missing required field",
  "details": {
    "companyUrl": "Required"
  }
}
```

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

#### Test 1.3: Reject Invalid URL Format
**Objective:** Verify URL validation

```bash
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companyUrl": "not-a-valid-url"
  }'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Invalid company URL format",
  "details": "Please provide a valid website URL or company name"
}
```

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

#### Test 1.4: Reject Non-Existent ICP Framework ID
**Objective:** Verify ICP framework validation

```bash
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companyUrl": "https://example.com",
    "icpFrameworkId": "00000000-0000-0000-0000-000000000000"
  }'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "ICP framework not found",
  "details": "The specified ICP framework does not exist or you do not have access to it"
}
```

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

#### Test 1.5: Accept Valid URL Formats
**Objective:** Verify various URL formats are accepted

```bash
# Test https URL
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companyUrl": "https://stripe.com"
  }'
```

**Expected Result:** Should proceed to ICP framework check (may fail if no framework exists, but should not fail on URL validation)

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

### GROUP 2: Successful Rating Generation (3 tests)

#### Test 2.1: Rate a Real Company (Stripe)
**Objective:** Generate a rating for a well-known company

**Prerequisites:**
- [ ] You have at least one ICP framework in database
- [ ] Get your ICP framework ID:
```bash
# List your ICP frameworks
curl http://localhost:3000/api/icp/frameworks \
  -H "Authorization: Bearer $JWT_TOKEN"
```

```bash
# Rate Stripe.com
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companyUrl": "https://stripe.com"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "rating": {
    "score": <integer 0-100>,
    "fitLevel": "<Excellent|Good|Fair|Poor>",
    "reasoning": "<explanation text>",
    "breakdown": {
      "industryFit": {
        "score": <0-25>,
        "explanation": "<text>"
      },
      "companySizeFit": {
        "score": <0-25>,
        "explanation": "<text>"
      },
      "painPointAlignment": {
        "score": <0-25>,
        "explanation": "<text>"
      },
      "buyerPersonaMatch": {
        "score": <0-25>,
        "explanation": "<text>"
      }
    },
    "strengths": ["<array of strengths>"],
    "concerns": ["<array of concerns>"],
    "recommendation": "<recommendation text>"
  },
  "savedId": "<uuid>",
  "metadata": {
    "companyName": "Stripe",
    "icpFramework": "<your product name>",
    "ratedAt": "<timestamp>",
    "apiDuration": "<ms>",
    "dataQuality": "minimal"
  }
}
```

**Validation Checklist:**
- [ ] `success` is `true`
- [ ] `rating.score` is between 0-100
- [ ] `rating.fitLevel` is one of: Excellent, Good, Fair, Poor
- [ ] `rating.reasoning` is a non-empty string
- [ ] `rating.breakdown` has all 4 categories
- [ ] All breakdown scores sum to <= 100
- [ ] `savedId` is a valid UUID
- [ ] `metadata.companyName` is present
- [ ] Response time < 10 seconds

**Status:** [ ] PASS / [ ] FAIL
**Actual Score:** _____
**Notes:** ______________________________

---

#### Test 2.2: Rate with Specific ICP Framework
**Objective:** Use a specific ICP framework ID

```bash
# Replace <framework-id> with your actual framework ID
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companyUrl": "https://hubspot.com",
    "icpFrameworkId": "<framework-id>"
  }'
```

**Expected Result:** Similar to Test 2.1 but using specified framework

**Validation Checklist:**
- [ ] Rating generated successfully
- [ ] `metadata.icpFramework` matches the specified framework's product name

**Status:** [ ] PASS / [ ] FAIL
**Actual Score:** _____
**Notes:** ______________________________

---

#### Test 2.3: Rate Multiple Different Companies
**Objective:** Verify consistency and variation in ratings

```bash
# Rate a SaaS company
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companyUrl": "https://salesforce.com"
  }'

# Rate a different industry
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companyUrl": "https://nike.com"
  }'
```

**Expected Result:** Different scores based on company fit

**Validation Checklist:**
- [ ] Both requests succeed
- [ ] Scores are different (unlikely to be identical)
- [ ] Reasoning reflects different company profiles
- [ ] Both saved to database with different IDs

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

### GROUP 3: Retrieval Endpoints (3 tests)

#### Test 3.1: Get All Current User Ratings
**Objective:** Retrieve all ratings for authenticated user

```bash
curl http://localhost:3000/api/ratings/current-user \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Result:**
```json
{
  "success": true,
  "ratings": [
    {
      "id": "<uuid>",
      "user_id": "<uuid>",
      "company_url": "https://...",
      "company_name": "...",
      "rating_score": <0-100>,
      "fit_level": "...",
      "reasoning": "...",
      "breakdown": {...},
      "strengths": [...],
      "concerns": [...],
      "recommendation": "...",
      "created_at": "...",
      "icp_frameworks": {
        "product_name": "...",
        "product_description": "..."
      }
    }
  ],
  "metadata": {
    "count": <number>,
    "total": <number>,
    "limit": 50,
    "offset": 0,
    "hasMore": <boolean>,
    "avgScore": <number>,
    "fitDistribution": {
      "excellent": <number>,
      "good": <number>,
      "fair": <number>,
      "poor": <number>
    },
    "mostRecent": "<timestamp or null>"
  }
}
```

**Validation Checklist:**
- [ ] `success` is `true`
- [ ] `ratings` is an array
- [ ] `ratings` contains previously created ratings
- [ ] `metadata.count` matches array length
- [ ] `metadata.avgScore` is reasonable
- [ ] `fitDistribution` counts match ratings

**Status:** [ ] PASS / [ ] FAIL
**Count:** _____ ratings
**Avg Score:** _____
**Notes:** ______________________________

---

#### Test 3.2: Test Pagination
**Objective:** Verify limit and offset parameters work

```bash
# Get first 2 ratings
curl "http://localhost:3000/api/ratings/current-user?limit=2&offset=0" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get next 2 ratings
curl "http://localhost:3000/api/ratings/current-user?limit=2&offset=2" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Result:**
- First request returns 2 ratings
- Second request returns different 2 ratings (if available)

**Validation Checklist:**
- [ ] First request has `metadata.limit=2`
- [ ] Second request has `metadata.offset=2`
- [ ] `metadata.hasMore` is correct
- [ ] Ratings are ordered by `created_at DESC`

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

#### Test 3.3: Filter by Score Range
**Objective:** Test minScore and maxScore filters

```bash
# Get only excellent fits (80-100)
curl "http://localhost:3000/api/ratings/current-user?minScore=80" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get only poor fits (0-39)
curl "http://localhost:3000/api/ratings/current-user?maxScore=39" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Result:**
- Results filtered by score range
- All returned ratings match the filter

**Validation Checklist:**
- [ ] All ratings in first request have score >= 80
- [ ] All ratings in second request have score <= 39
- [ ] `metadata.count` reflects filtered results

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

### GROUP 4: Batch Rating (2 tests)

#### Test 4.1: Rate Multiple Companies in Batch
**Objective:** Submit batch rating request

```bash
curl -X POST http://localhost:3000/api/ai/rate-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companies": [
      { "companyUrl": "https://asana.com" },
      { "companyUrl": "https://monday.com" },
      { "companyUrl": "https://notion.com" }
    ]
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "results": [
    {
      "companyUrl": "https://asana.com",
      "success": true,
      "rating": {...},
      "savedId": "<uuid>"
    },
    {
      "companyUrl": "https://monday.com",
      "success": true,
      "rating": {...},
      "savedId": "<uuid>"
    },
    {
      "companyUrl": "https://notion.com",
      "success": true,
      "rating": {...},
      "savedId": "<uuid>"
    }
  ],
  "metadata": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "durationMs": <number>,
    "avgTimePerCompany": <number>
  }
}
```

**Validation Checklist:**
- [ ] `success` is `true`
- [ ] `results` array has 3 items
- [ ] All 3 have `success: true`
- [ ] Each has a valid `savedId`
- [ ] `metadata.successful` is 3
- [ ] Response time is reasonable (< 30 seconds for 3 companies)

**Status:** [ ] PASS / [ ] FAIL
**Duration:** _____ ms
**Notes:** ______________________________

---

#### Test 4.2: Reject Batch Over Limit
**Objective:** Verify maximum 10 companies per batch

```bash
curl -X POST http://localhost:3000/api/ai/rate-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companies": [
      { "companyUrl": "https://c1.com" },
      { "companyUrl": "https://c2.com" },
      { "companyUrl": "https://c3.com" },
      { "companyUrl": "https://c4.com" },
      { "companyUrl": "https://c5.com" },
      { "companyUrl": "https://c6.com" },
      { "companyUrl": "https://c7.com" },
      { "companyUrl": "https://c8.com" },
      { "companyUrl": "https://c9.com" },
      { "companyUrl": "https://c10.com" },
      { "companyUrl": "https://c11.com" }
    ]
  }'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Maximum 10 companies per batch",
  "details": "You provided 11 companies. Please split into multiple batches."
}
```

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

### GROUP 5: Database Verification (2 tests)

#### Test 5.1: Verify Rating Saved to Database
**Objective:** Confirm data persists correctly

```bash
# 1. Create a rating
RATING_RESPONSE=$(curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companyUrl": "https://airtable.com"
  }')

echo $RATING_RESPONSE | jq '.savedId'

# 2. Retrieve it back
curl http://localhost:3000/api/ratings/current-user \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.ratings[0]'
```

**Validation Checklist:**
- [ ] savedId returned in create response
- [ ] Rating appears in retrieval response
- [ ] All fields match (score, reasoning, breakdown, etc.)
- [ ] Timestamps are valid ISO8601 format
- [ ] `user_id` matches authenticated user

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

#### Test 5.2: Verify RLS Policies (Data Isolation)
**Objective:** Ensure users can only see their own ratings

**Prerequisites:** You need two different user accounts with different JWT tokens

```bash
# User 1 creates a rating
export JWT_TOKEN_USER1="<user1-token>"
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN_USER1" \
  -d '{
    "companyUrl": "https://user1-company.com"
  }'

# User 2 tries to see ratings (should not see User 1's rating)
export JWT_TOKEN_USER2="<user2-token>"
curl http://localhost:3000/api/ratings/current-user \
  -H "Authorization: Bearer $JWT_TOKEN_USER2"
```

**Expected Result:**
- User 2 should NOT see User 1's rating
- Each user only sees their own ratings

**Validation Checklist:**
- [ ] User 1 can see their own rating
- [ ] User 2 cannot see User 1's rating
- [ ] User 2 sees empty array or only their own ratings

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

### GROUP 6: Rate Limiting (2 tests)

#### Test 6.1: Verify Rate Limit on Rating Generation
**Objective:** Test 10 requests per hour limit

```bash
# Make 11 requests in quick succession
for i in {1..11}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/ai/rate-company \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d "{\"companyUrl\": \"https://company$i.com\"}" \
    | jq '.error'
  sleep 1
done
```

**Expected Result:**
- First 10 requests succeed (may take time)
- 11th request returns 429 rate limit error

**Validation Checklist:**
- [ ] Requests 1-10 succeed or process
- [ ] Request 11 returns 429 status
- [ ] Error message indicates rate limit exceeded

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

#### Test 6.2: Verify Rate Limit on Retrieval
**Objective:** Test 30 requests per 15 minutes limit

```bash
# Make 31 requests in quick succession
for i in {1..31}; do
  echo "Request $i:"
  curl "http://localhost:3000/api/ratings/current-user" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    | jq '.success'
done
```

**Expected Result:**
- First 30 requests succeed
- 31st request returns 429

**Status:** [ ] PASS / [ ] FAIL
**Notes:** ______________________________

---

### GROUP 7: Error Handling (2 tests)

#### Test 7.1: Handle Invalid ICP Framework Structure
**Objective:** Test resilience to missing framework data

(This test requires manual database manipulation - optional)

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIPPED
**Notes:** ______________________________

---

#### Test 7.2: Handle Claude API Unavailability
**Objective:** Test error handling when AI service is down

(This test requires temporarily disabling API key - optional)

```bash
# Temporarily unset ANTHROPIC_API_KEY and restart server
# Then try to rate a company
curl -X POST http://localhost:3000/api/ai/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "companyUrl": "https://example.com"
  }'
```

**Expected Result:**
- 500 error with helpful message
- No database corruption

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIPPED
**Notes:** ______________________________

---

## Test Results Summary

### Overview
- **Total Tests:** 16
- **Passed:** _____ / 16
- **Failed:** _____ / 16
- **Skipped:** _____ / 16
- **Pass Rate:** _____%

### By Group
| Group | Description | Passed | Total | Pass Rate |
|-------|-------------|--------|-------|-----------|
| 1 | Input Validation | ___ / 5 | 5 | ___% |
| 2 | Rating Generation | ___ / 3 | 3 | ___% |
| 3 | Retrieval | ___ / 3 | 3 | ___% |
| 4 | Batch Rating | ___ / 2 | 2 | ___% |
| 5 | Database Verification | ___ / 2 | 2 | ___% |
| 6 | Rate Limiting | ___ / 2 | 2 | ___% |
| 7 | Error Handling | ___ / 2 | 2 | ___% |

### Failed Tests (RCA Required)
If any tests failed, perform Root Cause Analysis:

**Test:** _______________________________
**Failure Reason:** _______________________________
**Root Cause:** _______________________________
**Fix Applied:** _______________________________
**Retest Result:** [ ] PASS / [ ] FAIL

---

## Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Single rating response time | < 10s | ___s | [ ] PASS / [ ] FAIL |
| Batch rating (3 companies) | < 30s | ___s | [ ] PASS / [ ] FAIL |
| Retrieval response time | < 500ms | ___ms | [ ] PASS / [ ] FAIL |
| Rating accuracy (subjective) | Reasonable | _____ | [ ] PASS / [ ] FAIL |

---

## Sign-Off

**Tester Name:** _______________________________
**Date:** _______________________________
**Overall Status:** [ ] ALL TESTS PASS → Ready for Agent 1 Integration
                    [ ] SOME FAILURES → RCA Required
                    [ ] BLOCKED → See Notes

**Critical Issues:**
_______________________________
_______________________________

**Notes for Agent 1 (Frontend Lead):**
_______________________________
_______________________________

**Notes for Agent 3 (Infrastructure Lead):**
_______________________________
_______________________________

---

## Appendix: Troubleshooting

### Issue: "Authentication required" error
**Solution:** Verify JWT token is valid and not expired. Regenerate if needed.

### Issue: "No ICP framework found"
**Solution:** Create an ICP framework first via the Product Details widget or API.

### Issue: "AI returned invalid JSON"
**Solution:** Check Claude API key is valid. This is usually a transient AI issue - retry.

### Issue: "Rate limit exceeded"
**Solution:** Wait for rate limit window to reset, or test with a different user.

### Issue: Database connection errors
**Solution:** Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct.

### Issue: Very slow responses (>30s)
**Solution:** Check Anthropic API status. Consider implementing job queue (Phase 4).

---

**End of Manual Testing Guide**
