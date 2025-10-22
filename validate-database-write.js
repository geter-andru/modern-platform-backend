/**
 * Data Write Validation Script
 * Tests actual database writes with migrated snake_case field names
 *
 * Agent 3 - Database Migration Write Test
 * Date: October 21, 2025
 */

import supabaseDataService from './src/services/supabaseDataService.js';
import logger from './src/utils/logger.js';

async function validateDatabaseWrites() {
  console.log('📝 Data Write Validation - Testing snake_case field writes');
  console.log('='.repeat(70));
  console.log('');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    // Step 1: Find a real customer to test with
    console.log('Step 1: Finding test customer...');
    const customers = await supabaseDataService.getAllCustomers(1);

    if (customers.length === 0) {
      console.log('⚠️  No customers in database - cannot test writes');
      results.warnings.push('No customers available for write test');
      return results;
    }

    const testCustomer = customers[0];
    console.log(`✅ Found customer: ${testCustomer.customerId}`);
    console.log(`   Name: ${testCustomer.customerName || 'N/A'}`);
    console.log('');

    // Step 2: Test writing with snake_case fields
    console.log('Step 2: Testing snake_case field write...');
    try {
      const timestamp = new Date().toISOString();
      const testData = {
        last_accessed: timestamp,
        content_status: 'Validation Test'
      };

      console.log('   Writing fields:');
      console.log(`   - last_accessed: ${testData.last_accessed}`);
      console.log(`   - content_status: ${testData.content_status}`);

      const updated = await supabaseDataService.updateCustomer(
        testCustomer.customerId,
        testData
      );

      console.log('✅ Write successful!');
      console.log(`   Updated customer: ${updated.customer_id}`);
      results.passed.push('Snake_case field write');
    } catch (error) {
      console.log(`❌ Write failed: ${error.message}`);
      results.failed.push(`Write: ${error.message}`);
    }
    console.log('');

    // Step 3: Verify the write by reading back
    console.log('Step 3: Reading back to verify write...');
    try {
      const verifyCustomer = await supabaseDataService.getCustomerById(testCustomer.customerId);

      if (verifyCustomer) {
        console.log('✅ Read successful');
        console.log(`   last_accessed: ${verifyCustomer.lastAccessed}`);
        console.log(`   content_status: ${verifyCustomer.contentStatus}`);

        if (verifyCustomer.contentStatus === 'Validation Test') {
          console.log('✅ Data persisted correctly!');
          results.passed.push('Data persistence verification');
        } else {
          console.log('⚠️  Data may not have persisted');
          results.warnings.push('Content status not as expected');
        }
      }
    } catch (error) {
      console.log(`❌ Verification read failed: ${error.message}`);
      results.failed.push(`Verify: ${error.message}`);
    }
    console.log('');

    // Step 4: Test all migrated fields
    console.log('Step 4: Testing all migrated field names...');
    try {
      const allFieldsTest = {
        icp_content: JSON.stringify({ validated: true, test: 'icp' }),
        cost_calculator_content: JSON.stringify({ validated: true, test: 'calc' }),
        business_case_content: JSON.stringify({ validated: true, test: 'case' }),
        content_status: 'Full Validation',
        last_accessed: new Date().toISOString()
      };

      console.log('   Testing all 5 migrated fields:');
      Object.keys(allFieldsTest).forEach(key => {
        console.log(`   - ${key}`);
      });

      await supabaseDataService.updateCustomer(
        testCustomer.customerId,
        allFieldsTest
      );

      console.log('✅ All migrated fields accept writes!');
      results.passed.push('All migrated fields writable');
    } catch (error) {
      console.log(`❌ Full field test failed: ${error.message}`);
      results.failed.push(`All fields: ${error.message}`);
    }
    console.log('');

    // Step 5: Final verification
    console.log('Step 5: Final verification read...');
    try {
      const final = await supabaseDataService.getCustomerById(testCustomer.customerId);

      console.log('   Verifying all migrated fields are accessible:');
      const checks = [
        { name: 'icp_content', value: final.icpContent },
        { name: 'cost_calculator_content', value: final.costCalculatorContent },
        { name: 'business_case_content', value: final.businessCaseContent },
        { name: 'content_status', value: final.contentStatus },
        { name: 'last_accessed', value: final.lastAccessed }
      ];

      let allPresent = true;
      checks.forEach(check => {
        if (check.value !== null && check.value !== undefined) {
          console.log(`   ✅ ${check.name}: Present`);
        } else {
          console.log(`   ⚠️  ${check.name}: Not present`);
          allPresent = false;
        }
      });

      if (allPresent) {
        console.log('✅ All migrated fields verified!');
        results.passed.push('All fields read back successfully');
      }
    } catch (error) {
      console.log(`❌ Final verification failed: ${error.message}`);
      results.failed.push(`Final: ${error.message}`);
    }

  } catch (error) {
    console.log(`❌ Validation error: ${error.message}`);
    results.failed.push(`Validation: ${error.message}`);
  }

  // Summary
  console.log('');
  console.log('='.repeat(70));
  console.log('📊 Write Validation Summary');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(test => console.log(`   - ${test}`));
  console.log('');
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  results.warnings.forEach(warn => console.log(`   - ${warn}`));
  console.log('');
  console.log(`❌ Failed: ${results.failed.length}`);
  results.failed.forEach(fail => console.log(`   - ${fail}`));
  console.log('');

  if (results.failed.length === 0 && results.warnings.length === 0) {
    console.log('🎉 DATABASE WRITES: FULLY VALIDATED ✅');
    console.log('   All migrated snake_case fields work perfectly!');
  } else if (results.failed.length === 0) {
    console.log('✅ DATABASE WRITES: VALIDATED (with warnings)');
  } else {
    console.log('❌ DATABASE WRITES: ISSUES FOUND');
  }

  console.log('='.repeat(70));

  return results;
}

// Run validation
validateDatabaseWrites()
  .then(results => {
    process.exit(results.failed.length === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
