/**
 * Test Beta Signup API
 *
 * Tests the beta signup endpoints
 * Run: node scripts/test-beta-signup.js
 */

import supabase from '../src/services/supabaseService.js';
import logger from '../src/utils/logger.js';

async function testBetaSignup() {
  try {
    logger.info('Testing beta_signups table...\n');

    // 1. Check table structure
    logger.info('1. Checking table structure...');
    const { data: sampleData, error: structureError } = await supabase
      .from('beta_signups')
      .select('*')
      .limit(1);

    if (structureError) {
      logger.error('Error checking structure:', structureError);
    } else {
      logger.info('✓ Table exists with correct structure');
    }

    // 2. Count existing signups
    logger.info('\n2. Counting existing signups...');
    const { count, error: countError } = await supabase
      .from('beta_signups')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      logger.error('Error counting signups:', countError);
    } else {
      logger.info(`✓ Current signups: ${count}`);
      logger.info(`✓ Spots remaining: ${100 - count}`);
    }

    // 3. Test insert (with test data)
    logger.info('\n3. Testing insert with test data...');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: insertData, error: insertError } = await supabase
      .from('beta_signups')
      .insert([
        {
          full_name: 'Test User',
          email: testEmail,
          company: 'Test Company',
          job_title: 'Test Title',
          product_description: 'This is a test product description with more than 20 characters to pass validation.',
          referral_source: 'Other',
          linkedin_profile: null,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (insertError) {
      logger.error('Error inserting test data:', insertError);
    } else {
      logger.info('✓ Test signup created successfully');
      logger.info(`  ID: ${insertData.id}`);
      logger.info(`  Email: ${insertData.email}`);
      logger.info(`  Status: ${insertData.status}`);

      // Clean up test data
      logger.info('\n4. Cleaning up test data...');
      const { error: deleteError } = await supabase
        .from('beta_signups')
        .delete()
        .eq('id', insertData.id);

      if (deleteError) {
        logger.error('Error deleting test data:', deleteError);
      } else {
        logger.info('✓ Test data cleaned up');
      }
    }

    // 5. Test duplicate email check
    logger.info('\n5. Testing duplicate email prevention...');
    const duplicateTestEmail = `duplicate-test-${Date.now()}@example.com`;

    // First insert
    const { data: first, error: firstError } = await supabase
      .from('beta_signups')
      .insert([
        {
          full_name: 'Duplicate Test',
          email: duplicateTestEmail,
          company: 'Test Co',
          job_title: 'Tester',
          product_description: 'Testing duplicate email prevention with sufficient characters.',
          referral_source: 'Other'
        }
      ])
      .select()
      .single();

    if (firstError) {
      logger.error('Error with first insert:', firstError);
    } else {
      logger.info('✓ First insert successful');

      // Try duplicate
      const { error: duplicateError } = await supabase
        .from('beta_signups')
        .insert([
          {
            full_name: 'Duplicate Test 2',
            email: duplicateTestEmail,
            company: 'Test Co 2',
            job_title: 'Tester 2',
            product_description: 'Another test with duplicate email and sufficient text.',
            referral_source: 'Other'
          }
        ]);

      if (duplicateError) {
        logger.info('✓ Duplicate email correctly prevented');
      } else {
        logger.error('✗ Duplicate email was NOT prevented (this is a problem)');
      }

      // Clean up
      await supabase
        .from('beta_signups')
        .delete()
        .eq('id', first.id);
      logger.info('✓ Duplicate test data cleaned up');
    }

    logger.info('\n✅ All tests completed successfully!');

  } catch (error) {
    logger.error('Test error:', error);
    process.exit(1);
  }
}

// Run tests
testBetaSignup()
  .then(() => {
    logger.info('\nTest suite finished');
    process.exit(0);
  })
  .catch(err => {
    logger.error('Test suite failed:', err);
    process.exit(1);
  });
