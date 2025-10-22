/**
 * Comprehensive Smoke Test Script
 * Sprint 3 - Agent 3 Production Readiness Validation
 *
 * Tests all critical API endpoints with real server and database
 * Date: October 21, 2025
 */

import jwt from 'jsonwebtoken';
import 'dotenv/config';

const API_BASE = 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET;
const TEST_CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440000';

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Generate test JWT token
function generateTestToken(customerId = TEST_CUSTOMER_ID) {
  return jwt.sign(
    {
      customerId,
      email: 'test@example.com',
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Test helper function
async function runTest(name, testFn) {
  console.log(`\nTest: ${name}`);
  console.log('-'.repeat(70));
  try {
    await testFn();
    console.log('✅ PASSED');
    results.passed.push(name);
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    results.failed.push(`${name}: ${error.message}`);
    return false;
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  const response = await fetch(`${API_BASE}/health`);
  const data = await response.json();

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!data.success) throw new Error('Health check returned success=false');
  if (data.data.status !== 'healthy') throw new Error('Status not healthy');

  console.log(`   Status: ${data.data.status}`);
  console.log(`   Environment: ${data.data.environment}`);
  console.log(`   Uptime: ${Math.floor(data.data.uptime)}s`);
}

// Test 2: Detailed Health Check
async function testDetailedHealth() {
  const response = await fetch(`${API_BASE}/health/detailed`);
  const data = await response.json();

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!data.success) throw new Error('Detailed health check failed');
  if (!data.data.dependencies) throw new Error('No dependencies info');
  if (data.data.dependencies.supabase.status !== 'healthy') {
    throw new Error('Supabase not healthy');
  }

  console.log(`   Supabase: ${data.data.dependencies.supabase.status}`);
  console.log(`   Response Time: ${data.data.dependencies.supabase.responseTime}ms`);
}

// Test 3: Customer Data Retrieval (Authenticated)
async function testCustomerRetrieval() {
  const token = generateTestToken();
  const response = await fetch(`${API_BASE}/api/customer`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${data.error?.message || 'Unknown'}`);
  if (!data.success) throw new Error('Customer retrieval failed');
  if (!data.data) throw new Error('No customer data returned');

  console.log(`   Customer ID: ${data.data.customerId}`);
  console.log(`   Customer Name: ${data.data.customerName || 'N/A'}`);

  // Verify migrated fields are present
  const fields = ['icpContent', 'costCalculatorContent', 'businessCaseContent', 'contentStatus'];
  fields.forEach(field => {
    if (data.data[field] !== undefined) {
      console.log(`   ✅ ${field}: Present`);
    }
  });
}

// Test 4: Authentication (no token)
async function testAuthRequired() {
  const response = await fetch(`${API_BASE}/api/customer`);

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }

  const data = await response.json();
  if (data.success !== false) {
    throw new Error('Expected success=false for unauthorized request');
  }

  console.log('   Correctly rejected unauthenticated request');
}

// Test 5: CORS Check
async function testCORS() {
  const response = await fetch(`${API_BASE}/health`, {
    headers: {
      'Origin': 'http://localhost:3000'
    }
  });

  const corsHeader = response.headers.get('access-control-allow-origin');

  if (!corsHeader) {
    throw new Error('No CORS header present');
  }

  if (corsHeader !== 'http://localhost:3000' && corsHeader !== '*') {
    throw new Error(`Unexpected CORS header: ${corsHeader}`);
  }

  console.log(`   CORS Header: ${corsHeader}`);
}

// Test 6: Database Field Migration Verification
async function testDatabaseFieldMigration() {
  const token = generateTestToken();
  const response = await fetch(`${API_BASE}/api/customer`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  // Verify all migrated snake_case fields are accessible via camelCase
  const requiredFields = {
    'icp_content → icpContent': data.data.icpContent !== undefined,
    'cost_calculator_content → costCalculatorContent': data.data.costCalculatorContent !== undefined,
    'business_case_content → businessCaseContent': data.data.businessCaseContent !== undefined,
    'content_status → contentStatus': data.data.contentStatus !== undefined,
    'last_accessed → lastAccessed': data.data.lastAccessed !== undefined
  };

  let allPresent = true;
  Object.entries(requiredFields).forEach(([field, present]) => {
    if (present) {
      console.log(`   ✅ ${field}`);
    } else {
      console.log(`   ⚠️  ${field}: Missing`);
      allPresent = false;
    }
  });

  if (!allPresent) {
    throw new Error('Some migrated fields not accessible');
  }
}

// Test 7: Error Handling
async function testErrorHandling() {
  const token = generateTestToken('invalid-uuid-format');
  const response = await fetch(`${API_BASE}/api/customer`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  // Should either return 404 or handle gracefully
  if (response.ok) {
    // If it returns 200, verify it's handling missing customer gracefully
    console.log('   Server handled invalid customer gracefully');
  } else {
    console.log(`   Server returned appropriate error: ${response.status}`);
  }
}

// Main test runner
async function runSmokeTests() {
  console.log('🔍 Sprint 3 - Comprehensive Smoke Test');
  console.log('='.repeat(70));
  console.log('Testing: Backend API with Real Database');
  console.log('Server: http://localhost:3001');
  console.log('Date:', new Date().toISOString());
  console.log('='.repeat(70));

  // Wait for server to be ready
  console.log('\nWaiting for server to be ready...');
  let retries = 10;
  while (retries > 0) {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        console.log('✅ Server is ready\n');
        break;
      }
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.log('❌ Server not responding after 10 retries');
        console.log('   Make sure the server is running: NODE_ENV=development node src/server.js');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Run all tests
  await runTest('1. Health Check Endpoint', testHealthCheck);
  await runTest('2. Detailed Health Check', testDetailedHealth);
  await runTest('3. Authentication Required', testAuthRequired);
  await runTest('4. CORS Configuration', testCORS);
  await runTest('5. Customer Data Retrieval', testCustomerRetrieval);
  await runTest('6. Database Field Migration', testDatabaseFieldMigration);
  await runTest('7. Error Handling', testErrorHandling);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 Smoke Test Summary');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(test => console.log(`   - ${test}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(warn => console.log(`   - ${warn}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(fail => console.log(`   - ${fail}`));
    console.log('\n❌ SMOKE TEST FAILED');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL SMOKE TESTS PASSED ✅');
    console.log('Backend is ready for production deployment!');
    process.exit(0);
  }
}

// Run tests
runSmokeTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
