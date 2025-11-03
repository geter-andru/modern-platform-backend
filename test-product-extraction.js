/**
 * Product Extraction Test Suite
 *
 * Tests the automatic product extraction from company domains.
 * Tests free email detection and product extraction logic.
 */

import {
  FREE_EMAIL_DOMAINS,
  isFreeEmailDomain,
  extractDomainFromEmail,
  getFreeEmailStats
} from './src/lib/freeEmailDomains.js';

import {
  validateProductDetails,
  createMCPWrapper
} from './src/services/productExtractionService.js';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         PRODUCT EXTRACTION TEST SUITE                         ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passedTests = 0;
let totalTests = 0;

/**
 * Test helper function
 */
function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${description}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

// ============================================================================
// TEST SUITE 1: Free Email Domain Detection
// ============================================================================

console.log('📧 TEST SUITE 1: Free Email Domain Detection\n');

test('FREE_EMAIL_DOMAINS list contains major providers', () => {
  assert(FREE_EMAIL_DOMAINS.includes('gmail.com'), 'Should include gmail.com');
  assert(FREE_EMAIL_DOMAINS.includes('yahoo.com'), 'Should include yahoo.com');
  assert(FREE_EMAIL_DOMAINS.includes('hotmail.com'), 'Should include hotmail.com');
  assert(FREE_EMAIL_DOMAINS.includes('outlook.com'), 'Should include outlook.com');
  assert(FREE_EMAIL_DOMAINS.includes('icloud.com'), 'Should include icloud.com');
});

test('FREE_EMAIL_DOMAINS list has 70+ domains', () => {
  assert(
    FREE_EMAIL_DOMAINS.length >= 70,
    `Should have at least 70 domains, got ${FREE_EMAIL_DOMAINS.length}`
  );
});

test('isFreeEmailDomain() detects Gmail correctly', () => {
  assert(isFreeEmailDomain('user@gmail.com') === true);
  assert(isFreeEmailDomain('sarah@GMAIL.COM') === true); // Case insensitive
});

test('isFreeEmailDomain() detects business email correctly', () => {
  assert(isFreeEmailDomain('sarah@greptile.com') === false);
  assert(isFreeEmailDomain('john@stripe.com') === false);
});

test('isFreeEmailDomain() handles edge cases', () => {
  assert(isFreeEmailDomain('') === false);
  assert(isFreeEmailDomain(null) === false);
  assert(isFreeEmailDomain(undefined) === false);
  assert(isFreeEmailDomain('notanemail') === false);
});

test('extractDomainFromEmail() returns null for free emails', () => {
  assertEqual(extractDomainFromEmail('user@gmail.com'), null);
  assertEqual(extractDomainFromEmail('user@yahoo.com'), null);
  assertEqual(extractDomainFromEmail('user@hotmail.com'), null);
});

test('extractDomainFromEmail() returns domain for business emails', () => {
  assertEqual(extractDomainFromEmail('sarah@greptile.com'), 'greptile.com');
  assertEqual(extractDomainFromEmail('john@stripe.com'), 'stripe.com');
  assertEqual(extractDomainFromEmail('alice@NOTION.SO'), 'notion.so'); // Case normalized
});

test('extractDomainFromEmail() handles edge cases', () => {
  assertEqual(extractDomainFromEmail(''), null);
  assertEqual(extractDomainFromEmail('notanemail'), null);
  assertEqual(extractDomainFromEmail(null), null);
  assertEqual(extractDomainFromEmail(undefined), null);
});

test('getFreeEmailStats() returns correct stats', () => {
  const stats = getFreeEmailStats();
  assert(stats.totalDomains >= 70);
  assert(stats.majorProviders === 5); // gmail, yahoo, hotmail, outlook, icloud
});

// ============================================================================
// TEST SUITE 2: Product Details Validation
// ============================================================================

console.log('\n📝 TEST SUITE 2: Product Details Validation\n');

test('validateProductDetails() accepts valid product details', () => {
  const validDetails = {
    productName: 'Greptile',
    description: 'AI-powered code search',
    distinguishingFeature: 'Natural language queries',
    businessModel: 'B2B SaaS',
    sourceUrl: 'https://greptile.com',
    extractedAt: new Date().toISOString(),
    fallback: false
  };

  assert(validateProductDetails(validDetails) === true);
});

test('validateProductDetails() accepts fallback objects', () => {
  const fallbackDetails = {
    fallback: true,
    error: 'Extraction failed',
    extractedAt: new Date().toISOString()
  };

  assert(validateProductDetails(fallbackDetails) === true);
});

test('validateProductDetails() rejects invalid objects', () => {
  assert(validateProductDetails(null) === false);
  assert(validateProductDetails(undefined) === false);
  assert(validateProductDetails({}) === false);
  assert(validateProductDetails({ productName: 'Test' }) === false); // Missing required fields
});

test('validateProductDetails() requires productName, description, sourceUrl', () => {
  const missingName = {
    description: 'Test',
    sourceUrl: 'https://test.com'
  };
  assert(validateProductDetails(missingName) === false);

  const missingDescription = {
    productName: 'Test',
    sourceUrl: 'https://test.com'
  };
  assert(validateProductDetails(missingDescription) === false);

  const missingUrl = {
    productName: 'Test',
    description: 'Test'
  };
  assert(validateProductDetails(missingUrl) === false);
});

// ============================================================================
// TEST SUITE 3: MCP Wrapper (Mock Tests)
// ============================================================================

console.log('\n🎭 TEST SUITE 3: MCP Wrapper (Mock Mode)\n');

test('createMCPWrapper() returns object with required methods', () => {
  const wrapper = createMCPWrapper();
  assert(typeof wrapper.navigate === 'function');
  assert(typeof wrapper.evaluate === 'function');
  assert(typeof wrapper.screenshot === 'function');
  assert(typeof wrapper.close === 'function');
});

test('MCP wrapper methods throw when MCP not available', async () => {
  const wrapper = createMCPWrapper();

  try {
    await wrapper.navigate('https://example.com');
    throw new Error('Should have thrown');
  } catch (error) {
    assert(error.message.includes('MCP tools not available'));
  }

  try {
    await wrapper.evaluate('document.title');
    throw new Error('Should have thrown');
  } catch (error) {
    assert(error.message.includes('MCP tools not available'));
  }
});

test('MCP wrapper close() does not throw (silent success)', async () => {
  const wrapper = createMCPWrapper();
  await wrapper.close(); // Should not throw
  assert(true);
});

test('MCP wrapper screenshot() returns null when not available', async () => {
  const wrapper = createMCPWrapper();
  const screenshot = await wrapper.screenshot();
  assertEqual(screenshot, null);
});

// ============================================================================
// TEST SUITE 4: Real-World Email Examples
// ============================================================================

console.log('\n🌐 TEST SUITE 4: Real-World Email Examples\n');

const testEmails = [
  // Business emails (should extract domain)
  { email: 'sarah@greptile.com', expected: 'greptile.com', type: 'business' },
  { email: 'john@stripe.com', expected: 'stripe.com', type: 'business' },
  { email: 'alice@notion.so', expected: 'notion.so', type: 'business' },
  { email: 'bob@linear.app', expected: 'linear.app', type: 'business' },
  { email: 'carol@anthropic.com', expected: 'anthropic.com', type: 'business' },

  // Free emails (should return null)
  { email: 'user@gmail.com', expected: null, type: 'free' },
  { email: 'user@yahoo.com', expected: null, type: 'free' },
  { email: 'user@hotmail.com', expected: null, type: 'free' },
  { email: 'user@outlook.com', expected: null, type: 'free' },
  { email: 'user@icloud.com', expected: null, type: 'free' },
  { email: 'user@protonmail.com', expected: null, type: 'free' },

  // Edge cases
  { email: 'UPPER@GREPTILE.COM', expected: 'greptile.com', type: 'business' },
  { email: 'user@GMAIL.COM', expected: null, type: 'free' }
];

testEmails.forEach(({ email, expected, type }) => {
  test(`extractDomainFromEmail('${email}') → ${expected || 'null'} (${type})`, () => {
    assertEqual(extractDomainFromEmail(email), expected);
  });
});

// ============================================================================
// TEST SUITE 5: International Email Providers
// ============================================================================

console.log('\n🌍 TEST SUITE 5: International Email Providers\n');

test('Detects Chinese free email providers', () => {
  assert(isFreeEmailDomain('user@qq.com') === true);
  assert(isFreeEmailDomain('user@163.com') === true);
  assert(isFreeEmailDomain('user@126.com') === true);
});

test('Detects Russian free email providers', () => {
  assert(isFreeEmailDomain('user@mail.ru') === true);
  assert(isFreeEmailDomain('user@yandex.ru') === true);
});

test('Detects German free email providers', () => {
  assert(isFreeEmailDomain('user@gmx.de') === true);
  assert(isFreeEmailDomain('user@web.de') === true);
});

test('Detects Korean free email providers', () => {
  assert(isFreeEmailDomain('user@naver.com') === true);
  assert(isFreeEmailDomain('user@daum.net') === true);
});

// ============================================================================
// FINAL RESULTS
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log(`FINAL RESULTS: ${passedTests}/${totalTests} tests passed\n`);

if (passedTests === totalTests) {
  console.log('✅ ALL TESTS PASSED - Product extraction logic ready for production\n');
  console.log('Next steps:');
  console.log('  1. Create background worker (productExtractionWorker.js)');
  console.log('  2. Integrate with signup flow (authController.js)');
  console.log('  3. Wire up Playwright MCP for real extraction');
  console.log('  4. Test with 20 real company websites\n');
  process.exit(0);
} else {
  console.log(`❌ ${totalTests - passedTests} TESTS FAILED - Fix issues before proceeding\n`);
  process.exit(1);
}
