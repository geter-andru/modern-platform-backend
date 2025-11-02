/**
 * Test Script for ICP Job Queue
 * 
 * Tests the ICP generation job queue infrastructure:
 * 1. Queue initialization
 * 2. Job submission
 * 3. Job status checking
 * 4. Worker processing (if workers are running)
 * 
 * Run with: node test-icp-job-queue.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { getICPQueue, addICPGenerationJob, getJobStatus } from './src/lib/queue.js';
import logger from './src/utils/logger.js';

// Test customer ID (replace with a real user ID from your database)
const TEST_CUSTOMER_ID = process.env.TEST_CUSTOMER_ID || '85e54a00-d75b-420e-a3bb-ddd750fc548a';

async function testICPJobQueue() {
  console.log('🧪 Starting ICP Job Queue Test...\n');

  try {
    // Test 1: Queue initialization
    console.log('📦 Test 1: Queue Initialization');
    const icpQueue = getICPQueue();
    console.log('✅ ICP queue initialized:', icpQueue.name);
    console.log('');

    // Test 2: Job submission
    console.log('📤 Test 2: Job Submission');
    const testProductInfo = {
      name: 'Test Product',
      description: 'A test product for ICP generation',
      distinguishingFeature: 'AI-powered analysis',
      businessModel: 'b2b-subscription'
    };

    const jobInfo = await addICPGenerationJob({
      customerId: TEST_CUSTOMER_ID,
      productInfo: testProductInfo,
      industry: 'Technology',
      goals: ['increase revenue', 'improve operations']
    });

    console.log('✅ Job submitted successfully:');
    console.log('   Job ID:', jobInfo.jobId);
    console.log('   Queue Name:', jobInfo.queueName);
    console.log('   Status:', jobInfo.status);
    console.log('');

    // Test 3: Job status check
    console.log('🔍 Test 3: Job Status Check');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const jobStatus = await getJobStatus(icpQueue, jobInfo.jobId);
    
    if (jobStatus) {
      console.log('✅ Job status retrieved:');
      console.log('   Job ID:', jobStatus.jobId);
      console.log('   Status:', jobStatus.status);
      console.log('   Progress:', jobStatus.progress, '%');
      console.log('   Attempts Made:', jobStatus.attemptsMade);
      
      if (jobStatus.result) {
        console.log('   Result:', 'Job completed successfully');
      } else if (jobStatus.failedReason) {
        console.log('   Failed Reason:', jobStatus.failedReason);
      } else {
        console.log('   Result:', 'Job is still processing');
      }
    } else {
      console.log('⚠️  Job not found (may have been processed and removed)');
    }
    console.log('');

    // Test 4: Queue health check
    console.log('🏥 Test 4: Queue Health Check');
    const [waiting, active, completed, failed] = await Promise.all([
      icpQueue.getWaitingCount().catch(() => 0),
      icpQueue.getActiveCount().catch(() => 0),
      icpQueue.getCompletedCount().catch(() => 0),
      icpQueue.getFailedCount().catch(() => 0)
    ]);

    console.log('✅ Queue statistics:');
    console.log('   Waiting:', waiting);
    console.log('   Active:', active);
    console.log('   Completed:', completed);
    console.log('   Failed:', failed);
    console.log('');

    console.log('✅ All tests completed successfully!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Ensure backend workers are running (start backend server)');
    console.log('   2. Monitor job status: GET /api/jobs/' + jobInfo.jobId);
    console.log('   3. Check backend logs for worker processing');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testICPJobQueue().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
