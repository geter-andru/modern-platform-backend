# Job API Testing Guide
**Phase 4, Chunk 3 - Job Status API Endpoints**
**Created:** 2025-10-28
**Status:** Ready for testing after server restart

---

## Prerequisites

1. ✅ Backend server running on `http://localhost:3001`
2. ✅ Valid Supabase JWT token for authentication
3. ✅ Workers started (either via separate process or integrated)

---

## Getting a Test JWT Token

```bash
# Option 1: Extract from browser (easiest)
# 1. Login to frontend at http://localhost:3000
# 2. Open DevTools → Application → Local Storage
# 3. Find 'supabase.auth.token' → Copy access_token value

# Option 2: Use existing test token from .env
TOKEN="your-supabase-jwt-here"
```

---

## Test 1: Submit Persona Generation Job

**Endpoint:** `POST /api/jobs/personas`

```bash
curl -X POST http://localhost:3001/api/jobs/personas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "companyContext": "We are a B2B SaaS company selling sales automation tools to mid-market companies",
    "industry": "Enterprise Software",
    "targetMarket": "Sales leaders at companies with 50-500 employees"
  }'
```

**Expected Response (202 Accepted):**
```json
{
  "success": true,
  "jobId": "persona-<user-id>-<timestamp>",
  "status": "queued",
  "message": "Persona generation job queued. Use jobId to check status.",
  "estimatedDuration": "30-60 seconds",
  "statusEndpoint": "/api/jobs/persona-<user-id>-<timestamp>"
}
```

**Save jobId for next tests!**

---

## Test 2: Check Job Status

**Endpoint:** `GET /api/jobs/:jobId`

```bash
# Use jobId from Test 1
JOB_ID="persona-test-user-123-1234567890"

curl -X GET "http://localhost:3001/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**

**While processing:**
```json
{
  "success": true,
  "job": {
    "jobId": "persona-test-user-123-1234567890",
    "queueName": "persona-generation",
    "status": "active",
    "progress": 0,
    "data": {
      "customerId": "test-user-123",
      "companyContext": "We are a B2B SaaS...",
      "industry": "Enterprise Software",
      "targetMarket": "Sales leaders...",
      "submittedAt": "2025-10-28T18:00:00.000Z"
    },
    "result": null,
    "failedReason": null,
    "attemptsMade": 0,
    "timestamp": 1234567890,
    "processedOn": 1234567895,
    "finishedOn": null
  }
}
```

**When completed:**
```json
{
  "success": true,
  "job": {
    "jobId": "persona-test-user-123-1234567890",
    "queueName": "persona-generation",
    "status": "completed",
    "progress": 100,
    "result": {
      "success": true,
      "personas": [...],
      "savedId": "uuid-here",
      "metadata": {...}
    },
    "failedReason": null,
    "finishedOn": 1234567920
  }
}
```

---

## Test 3: Submit Company Rating Job

**Endpoint:** `POST /api/jobs/rate-company`

```bash
curl -X POST http://localhost:3001/api/jobs/rate-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "companyUrl": "https://salesforce.com"
  }'
```

**Expected Response (202 Accepted):**
```json
{
  "success": true,
  "jobId": "rating-<user-id>-<timestamp>",
  "status": "queued",
  "message": "Company rating job queued. Use jobId to check status.",
  "estimatedDuration": "10-20 seconds",
  "statusEndpoint": "/api/jobs/rating-<user-id>-<timestamp>"
}
```

---

## Test 4: Submit Batch Rating Job

**Endpoint:** `POST /api/jobs/rate-batch`

```bash
curl -X POST http://localhost:3001/api/jobs/rate-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "companies": [
      "https://salesforce.com",
      "https://hubspot.com",
      "https://zendesk.com"
    ]
  }'
```

**Expected Response (202 Accepted):**
```json
{
  "success": true,
  "jobId": "batch-<user-id>-<timestamp>",
  "status": "queued",
  "totalCompanies": 3,
  "message": "Batch rating job queued. Use jobId to check status and progress.",
  "estimatedDuration": "30-45 seconds",
  "statusEndpoint": "/api/jobs/batch-<user-id>-<timestamp>"
}
```

---

## Test 5: Get Current User Jobs

**Endpoint:** `GET /api/jobs/current-user`

```bash
curl -X GET http://localhost:3001/api/jobs/current-user \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Job listing for current user",
  "queueStats": {
    "personaGeneration": {
      "queueName": "persona-generation",
      "waiting": 0,
      "active": 1,
      "completed": 5,
      "failed": 0,
      "delayed": 0,
      "total": 6
    },
    "companyRating": {...},
    "batchRating": {...}
  },
  "note": "Full job history not yet implemented - use individual job status endpoints"
}
```

---

## Test 6: Error Handling - Unauthenticated

```bash
curl -X POST http://localhost:3001/api/jobs/personas \
  -H "Content-Type: application/json" \
  -d '{
    "companyContext": "Test company",
    "industry": "Technology"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

---

## Test 7: Error Handling - Invalid Input

```bash
curl -X POST http://localhost:3001/api/jobs/personas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "companyContext": "Short",
    "industry": "Tech"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "companyContext must be at least 10 characters"
}
```

---

## Test 8: Error Handling - Job Not Found

```bash
curl -X GET http://localhost:3001/api/jobs/invalid-job-id-12345 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid jobId format"
}
```

---

## Test 9: Rate Limiting

```bash
# Submit 11 jobs rapidly (limit is 10/hour)
for i in {1..11}; do
  curl -X POST http://localhost:3001/api/jobs/personas \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "companyContext": "Test company context for rate limit testing",
      "industry": "Technology"
    }'
  echo ""
done
```

**Expected:** 11th request returns 429 Too Many Requests

---

## Test 10: Polling Job Status (Simulating Frontend)

```bash
# Get jobId from Test 1
JOB_ID="persona-test-user-123-1234567890"

# Poll every 2 seconds until completed or failed
while true; do
  RESPONSE=$(curl -s "http://localhost:3001/api/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN")

  STATUS=$(echo $RESPONSE | jq -r '.job.status')
  PROGRESS=$(echo $RESPONSE | jq -r '.job.progress')

  echo "Status: $STATUS | Progress: $PROGRESS%"

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    echo "Job finished!"
    echo $RESPONSE | jq '.'
    break
  fi

  sleep 2
done
```

---

## Verification Checklist

After running all tests, verify:

- [ ] Persona job submits successfully (202 response)
- [ ] Job status returns correct data structure
- [ ] Job status updates from waiting → active → completed
- [ ] Rating job submits successfully
- [ ] Batch rating job submits successfully
- [ ] Current user jobs endpoint returns queue stats
- [ ] Authentication errors return 401
- [ ] Validation errors return 400 with details
- [ ] Invalid jobId returns 400
- [ ] Rate limiting works (429 after limit exceeded)
- [ ] Job status can be polled repeatedly (60/min rate limit)
- [ ] Completed jobs return result data
- [ ] Failed jobs return failedReason

---

## Expected Job Flow Timeline

**Persona Generation:**
1. t=0s: Submit job → Status: waiting
2. t=1s: Worker picks up → Status: active
3. t=2-5s: Claude API call
4. t=5-10s: Database save
5. t=10s: Complete → Status: completed with result

**Company Rating:**
1. t=0s: Submit job → Status: waiting
2. t=1s: Worker picks up → Status: active
3. t=2-8s: ICP framework fetch + company research + Claude API
4. t=8-12s: Database save
5. t=12s: Complete → Status: completed with rating

**Batch Rating:**
1. t=0s: Submit job → Status: waiting
2. t=1s: Worker picks up → Status: active
3. t=2-60s: Process each company sequentially (progress updates)
4. t=60s: Complete → Status: completed with batch results

---

## Notes for Agent 1 (Frontend Integration)

When integrating the `useJobStatus` hook:

1. **Job Submission Pattern:**
   ```typescript
   const { jobId } = await authenticatedFetch('/api/jobs/personas', {
     method: 'POST',
     body: JSON.stringify({ companyContext, industry, targetMarket })
   });
   ```

2. **Status Polling Pattern:**
   ```typescript
   const { status, result, progress } = useJobStatus(jobId, {
     pollInterval: 2000, // 2 seconds
     onComplete: (result) => { /* handle completion */ },
     onError: (error) => { /* handle failure */ }
   });
   ```

3. **Display States:**
   - `waiting`: Show "Job queued..."
   - `active`: Show "Processing... {progress}%"
   - `completed`: Show results
   - `failed`: Show error message from `failedReason`

---

## Success Criteria

✅ All 10 tests pass
✅ Job submission returns 202 with jobId
✅ Job status tracking works correctly
✅ Workers process jobs and update status
✅ Completed jobs return results
✅ Failed jobs capture error reasons
✅ Rate limiting enforced
✅ Authentication required on all endpoints
✅ Input validation catches bad requests

---

**Phase 4, Chunk 3: READY FOR TESTING**

**Next:** Restart server → Run tests → Proceed to Chunk 4 (useJobStatus hook)
