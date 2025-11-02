#!/bin/bash

# Test Script for ICP Job Queue Endpoint
# 
# Tests the /api/jobs/generate-icp endpoint with authentication
# 
# Usage: ./test-icp-endpoint.sh [auth_token]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
AUTH_TOKEN="${1:-}"

echo -e "${BLUE}🧪 Testing ICP Job Queue Endpoint${NC}\n"

# Check if backend is running
echo -e "${BLUE}1. Checking backend health...${NC}"
if ! curl -s -f "${BACKEND_URL}/api/health" > /dev/null; then
    echo -e "${RED}❌ Backend is not running at ${BACKEND_URL}${NC}"
    echo -e "${YELLOW}💡 Start the backend with: cd backend && npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}\n"

# Check authentication
if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  No auth token provided${NC}"
    echo -e "${YELLOW}💡 Get a token from your Supabase session and run:${NC}"
    echo -e "${YELLOW}   ./test-icp-endpoint.sh YOUR_TOKEN${NC}\n"
    echo -e "${BLUE}Testing endpoint without auth (should fail with 401)...${NC}"
    AUTH_HEADER=""
else
    echo -e "${BLUE}2. Using provided auth token...${NC}"
    AUTH_HEADER="Authorization: Bearer ${AUTH_TOKEN}"
    echo -e "${GREEN}✅ Auth token set${NC}\n"
fi

# Test job submission
echo -e "${BLUE}3. Submitting ICP generation job...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/jobs/generate-icp" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -d '{
    "productInfo": {
      "name": "Test Product",
      "description": "A test product for ICP generation testing",
      "distinguishingFeature": "AI-powered analysis",
      "businessModel": "b2b-subscription"
    },
    "industry": "Technology",
    "goals": ["increase revenue", "improve operations"]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 202 ]; then
    echo -e "${GREEN}✅ Job submitted successfully${NC}"
    echo -e "${BLUE}Response:${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    
    # Extract job ID
    JOB_ID=$(echo "$BODY" | jq -r '.jobId' 2>/dev/null || echo "")
    
    if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
        echo -e "\n${BLUE}4. Checking job status...${NC}"
        sleep 2
        
        STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BACKEND_URL}/api/jobs/${JOB_ID}" \
          -H "${AUTH_HEADER}")
        
        STATUS_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
        STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed '$d')
        
        if [ "$STATUS_CODE" -eq 200 ]; then
            echo -e "${GREEN}✅ Job status retrieved${NC}"
            echo -e "${BLUE}Status:${NC}"
            echo "$STATUS_BODY" | jq '.' 2>/dev/null || echo "$STATUS_BODY"
        else
            echo -e "${YELLOW}⚠️  Status check failed: HTTP ${STATUS_CODE}${NC}"
            echo "$STATUS_BODY"
        fi
    else
        echo -e "${YELLOW}⚠️  Could not extract job ID from response${NC}"
    fi
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${RED}❌ Authentication failed (401)${NC}"
    echo -e "${YELLOW}💡 You need a valid Supabase session token${NC}"
    echo -e "${YELLOW}   Get it from browser dev tools > Application > Cookies > sb-<project>-auth-token${NC}"
elif [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${RED}❌ Bad Request (400)${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" -eq 429 ]; then
    echo -e "${YELLOW}⚠️  Rate limit exceeded (429)${NC}"
    echo -e "${YELLOW}💡 Wait a bit and try again${NC}"
else
    echo -e "${RED}❌ Request failed: HTTP ${HTTP_CODE}${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo -e "\n${BLUE}📝 Test Summary${NC}"
echo -e "   HTTP Status: ${HTTP_CODE}"
echo -e "   Job ID: ${JOB_ID:-N/A}"
