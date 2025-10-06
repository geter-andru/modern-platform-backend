/**
 * Supabase Migration Test Script
 *
 * Tests backend API endpoints with proper Supabase authentication
 * Quality-focused approach - uses real authentication flow
 */

import { createClient } from '@supabase/supabase-js';
import config from './src/config/index.js';

const BACKEND_URL = 'http://localhost:3001';
const TEST_USER = {
  email: 'test-migration@humusnshore.org',
  password: 'TestMigration2025!',
  userId: '3537b889-3148-4b07-a31b-ebbd1bb150a4'
};

async function getSupabaseToken() {
  console.log('\n🔐 Step 1: Authenticating with Supabase...');

  const supabase = createClient(
    config.supabase.url,
    config.supabase.anonKey
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (error) {
    throw new Error(`Supabase authentication failed: ${error.message}`);
  }

  if (!data.session) {
    throw new Error('No session returned from Supabase');
  }

  console.log('✅ Supabase authentication successful');
  console.log('   User ID:', data.user.id);
  console.log('   Email:', data.user.email);
  console.log('   Token expires:', new Date(data.session.expires_at * 1000).toISOString());

  return {
    token: data.session.access_token,
    userId: data.user.id,
    email: data.user.email
  };
}

async function testGetCustomer(token, userId) {
  console.log('\n📊 Step 2: Testing GET /api/customer/:id...');

  const response = await fetch(`${BACKEND_URL}/api/customer/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`GET customer failed: ${data.error} - ${data.details}`);
  }

  console.log('✅ GET /api/customer/:id SUCCESS');
  console.log('   Customer Name:', data.data?.customerName);
  console.log('   Email:', data.data?.email);
  console.log('   Company:', data.data?.company);
  console.log('   ICP exists:', !!data.data?.icpContent);
  console.log('   Last accessed:', data.data?.lastAccessed);

  return data.data;
}

async function testUpdateCustomer(token, userId) {
  console.log('\n✏️  Step 3: Testing PUT /api/customer/:id...');

  const testData = {
    'Company': 'Humus & Shore (Updated by Test)',
    'Usage Count': Math.floor(Math.random() * 100)
  };

  const response = await fetch(`${BACKEND_URL}/api/customer/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`PUT customer failed: ${data.error} - ${data.details}`);
  }

  console.log('✅ PUT /api/customer/:id SUCCESS');
  console.log('   Updated:', data.data?.updated);
  console.log('   Timestamp:', data.data?.timestamp);

  return data.data;
}

async function testGetCustomerICP(token, userId) {
  console.log('\n🎯 Step 4: Testing GET /api/customer/:id/icp...');

  const response = await fetch(`${BACKEND_URL}/api/customer/${userId}/icp`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`GET ICP failed: ${data.error} - ${data.details}`);
  }

  console.log('✅ GET /api/customer/:id/icp SUCCESS');
  console.log('   Customer ID:', data.data?.customerId);
  console.log('   ICP Data:', data.data?.icpData ? 'Present' : 'Not found');
  console.log('   Content Status:', data.data?.contentStatus);

  return data.data;
}

async function verifySupabaseData(userId) {
  console.log('\n🗄️  Step 5: Verifying data in Supabase...');

  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey // Use service role for direct DB access
  );

  const { data, error } = await supabase
    .from('customer_assets')
    .select('*')
    .eq('customer_id', userId)
    .single();

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  console.log('✅ Supabase data verification SUCCESS');
  console.log('   Customer Name:', data.customer_name);
  console.log('   Company:', data.company);
  console.log('   Usage Count:', data.usage_count);
  console.log('   Last Accessed:', data.last_accessed);
  console.log('   Updated At:', data.updated_at);

  return data;
}

async function runTests() {
  console.log('🧪 Starting Supabase Migration Test Suite');
  console.log('=' .repeat(60));

  try {
    // Step 1: Get Supabase JWT token
    const auth = await getSupabaseToken();

    // Step 2: Test GET customer
    const customer = await testGetCustomer(auth.token, auth.userId);

    // Step 3: Test UPDATE customer
    await testUpdateCustomer(auth.token, auth.userId);

    // Step 4: Test GET ICP
    await testGetCustomerICP(auth.token, auth.userId);

    // Step 5: Verify Supabase data
    await verifySupabaseData(auth.userId);

    console.log('\n' + '='.repeat(60));
    console.log('✨ All tests PASSED - Supabase migration working correctly!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Test FAILED:', error.message);
    console.error('=' .repeat(60));
    process.exit(1);
  }
}

// Run tests
runTests();
