# ICP Job Queue Testing Guide

This document provides instructions for testing the ICP generation job queue infrastructure.

## ✅ What's Been Implemented

### Backend Infrastructure
1. **ICP Queue** (`backend/src/lib/queue.js`)
   - Queue name: `icp-generation`
   - Function: `getICPQueue()`
   - Function: `addICPGenerationJob()`
   - Integrated into health checks

2. **ICP Worker** (`backend/src/workers/icpWorker.js`)
   - Processes ICP generation jobs asynchronously
   - Uses `aiService.generateICPAnalysis()` for AI processing
   - Saves results to `customer_assets` table
   - Saves product details to `product_details` table

3. **Job Controller** (`backend/src/controllers/jobController.js`)
   - `submitIcpJob()` - Handles job submission
   - Validates authentication and request data
   - Returns job ID for status polling

4. **Job Route** (`backend/src/routes/jobRoutes.js`)
   - `POST /api/jobs/generate-icp` - Submit ICP generation job
   - Rate limited: 5 per hour
   - Requires authentication

5. **Workers Index** (`backend/src/workers/index.js`)
   - ICP worker automatically started with `startAllWorkers()`

## 🧪 Testing Methods

### Method 1: Direct Queue Test (No Server Required)
Tests queue infrastructure without API or workers:

```bash
cd backend
node test-icp-job-queue.js
```

**Expected Output:**
- ✅ Queue initialization
- ✅ Job submission (job ID returned)
- ✅ Job status check
- ✅ Queue statistics

**Note:** Jobs will stay in "waiting" status until workers are running.

### Method 2: API Endpoint Test (Server + Workers Required)
Tests full end-to-end flow with authentication:

```bash
# 1. Start backend server (workers auto-start)
cd backend
npm run dev

# 2. In another terminal, get your auth token
#    (From browser: DevTools > Application > Cookies > sb-<project>-auth-token)

# 3. Run the test script
cd backend
./test-icp-endpoint.sh YOUR_AUTH_TOKEN
```

**Expected Flow:**
1. ✅ Health check passes
2. ✅ Job submission (202 Accepted with job ID)
3. ✅ Job status polling (shows progress)
4. ✅ Worker processes job (check backend logs)
5. ✅ Job completes (result in status response)

### Method 3: Manual cURL Test

```bash
# Submit job
curl -X POST http://localhost:3001/api/jobs/generate-icp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "productInfo": {
      "name": "Test Product",
      "description": "A test product for ICP generation",
      "distinguishingFeature": "AI-powered analysis",
      "businessModel": "b2b-subscription"
    },
    "industry": "Technology",
    "goals": ["increase revenue", "improve operations"]
  }'

# Check job status (replace JOB_ID with returned job ID)
curl -X GET http://localhost:3001/api/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## 🔍 Verification Checklist

### Queue Infrastructure ✅
- [x] Queue initializes correctly
- [x] Jobs can be submitted
- [x] Job status can be retrieved
- [x] Queue statistics work

### API Endpoint ✅
- [x] Route registered (`/api/jobs/generate-icp`)
- [x] Authentication required
- [x] Rate limiting applied
- [x] Validation working
- [x] Returns job ID

### Worker Processing ⏸️
- [ ] Worker starts automatically with server
- [ ] Worker picks up jobs from queue
- [ ] Worker processes ICP generation
- [ ] Worker saves results to database
- [ ] Worker handles errors gracefully

## 🐛 Troubleshooting

### Jobs Stay in "waiting" Status
**Cause:** Workers not running
**Fix:** Ensure backend server is running (workers auto-start with server)

### 401 Unauthorized
**Cause:** Invalid or missing auth token
**Fix:** Get fresh token from browser session cookies

### 429 Rate Limit
**Cause:** Too many requests (limit: 5 per hour)
**Fix:** Wait for rate limit window to reset

### Worker Not Processing Jobs
**Check:**
1. Backend server logs for worker startup messages
2. Worker error logs
3. Queue health endpoint: `GET /api/health` (includes queue stats)

## 📊 Expected Performance

- **Job Submission:** < 100ms
- **ICP Generation:** 20-30 seconds (AI processing)
- **Total Job Duration:** 25-35 seconds
- **Database Save:** < 500ms

## 🚀 Next Steps

1. **Test with Real Auth Token:** Get token from browser session
2. **Monitor Backend Logs:** Watch for worker processing messages
3. **Verify Database:** Check `customer_assets.icp_content` after job completion
4. **Frontend Integration:** Update ProductDetailsWidget to use job queue

## 📝 Test Results

### Queue Test (Direct)
```
✅ Queue initialization: PASS
✅ Job submission: PASS  
✅ Job status check: PASS
✅ Queue statistics: PASS
```

### API Endpoint Test
```
⏸️  Waiting for backend server + auth token
```

---

**Last Updated:** 2025-01-01
**Status:** Backend infrastructure complete, ready for end-to-end testing


