#!/bin/bash

# Full ICP Job Queue Flow Test
# Tests complete flow: job submission -> status polling -> worker processing

set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
AUTH_TOKEN="${1:-test-token}"

echo "🧪 Full ICP Job Queue Flow Test"
echo "================================"
echo ""

# Step 1: Submit Job
echo "📤 Step 1: Submitting ICP Generation Job..."
JOB_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/jobs/generate-icp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "productInfo": {
      "name": "Test Product",
      "description": "A comprehensive test product for ICP generation",
      "distinguishingFeature": "AI-powered analysis engine",
      "businessModel": "b2b-subscription"
    },
    "industry": "Technology",
    "goals": ["increase revenue", "improve operations", "scale efficiently"]
  }')

JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.jobId' 2>/dev/null || echo "")

if [ -z "$JOB_ID" ] || [ "$JOB_ID" = "null" ]; then
  echo "❌ Failed to submit job"
  echo "$JOB_RESPONSE"
  exit 1
fi

echo "✅ Job submitted successfully"
echo "   Job ID: $JOB_ID"
echo ""

# Step 2: Check Initial Status
echo "🔍 Step 2: Checking Initial Job Status..."
sleep 2

STATUS_RESPONSE=$(curl -s -X GET "${BACKEND_URL}/api/jobs/${JOB_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.job.status' 2>/dev/null || echo "")
PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.job.progress' 2>/dev/null || echo "0")

echo "   Status: ${STATUS:-unknown}"
echo "   Progress: ${PROGRESS}%"
echo ""

# Step 3: Poll for Completion (up to 60 seconds)
echo "⏳ Step 3: Polling for Job Completion (max 60 seconds)..."
MAX_ATTEMPTS=30
ATTEMPT=0
COMPLETED=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
  
  STATUS_RESPONSE=$(curl -s -X GET "${BACKEND_URL}/api/jobs/${JOB_ID}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.job.status' 2>/dev/null || echo "")
  PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.job.progress' 2>/dev/null || echo "0")
  
  echo -ne "\r   Attempt $ATTEMPT/$MAX_ATTEMPTS: Status=$STATUS, Progress=${PROGRESS}%"
  
  if [ "$STATUS" = "completed" ]; then
    COMPLETED=true
    echo ""
    echo ""
    echo "✅ Job completed successfully!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo ""
    echo "❌ Job failed"
    FAILED_REASON=$(echo "$STATUS_RESPONSE" | jq -r '.job.failedReason' 2>/dev/null || echo "Unknown")
    echo "   Reason: $FAILED_REASON"
    exit 1
  fi
done

if [ "$COMPLETED" = false ]; then
  echo ""
  echo ""
  echo "⚠️  Job did not complete within timeout"
  echo "   Current status: $STATUS"
  echo "   Final progress: ${PROGRESS}%"
fi

echo ""
echo "📊 Final Job Status:"
echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"

echo ""
echo "✅ Test completed"
