/**
 * Standalone Puppeteer Product Extraction Test
 *
 * Tests the complete product extraction flow:
 * 1. Launch Puppeteer browser
 * 2. Navigate to company website
 * 3. Extract page content
 * 4. Send to Claude AI for structured extraction
 * 5. Display results
 */

import puppeteer from 'puppeteer';
import { extractProductDetailsFromDomain } from './src/services/productExtractionService.js';

/**
 * Create browser automation wrapper using Puppeteer
 */
async function createBrowserWrapper() {
  console.log('[Test] Launching Puppeteer browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  console.log('[Test] ✅ Browser launched successfully\n');

  return {
    async navigate(url) {
      console.log(`[Test] 🌐 Navigating to: ${url}`);
      const startTime = Date.now();

      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        const elapsed = Date.now() - startTime;
        console.log(`[Test] ✅ Navigation successful (${elapsed}ms)\n`);
      } catch (error) {
        console.error(`[Test] ❌ Navigation failed:`, error.message);
        throw error;
      }
    },

    async evaluate(script) {
      console.log('[Test] 📝 Evaluating script in page context...');
      const startTime = Date.now();

      try {
        const result = await page.evaluate(script);
        const elapsed = Date.now() - startTime;
        console.log(`[Test] ✅ Script evaluation successful (${elapsed}ms)`);

        // Log extracted content summary
        if (result.text) {
          console.log(`[Test] 📄 Extracted text: ${result.text.length} characters`);
        }
        if (result.metaDescription) {
          console.log(`[Test] 📋 Meta description: "${result.metaDescription.slice(0, 100)}..."`);
        }
        if (result.h1) {
          console.log(`[Test] 📌 H1 heading: "${result.h1}"`);
        }
        if (result.title) {
          console.log(`[Test] 📖 Page title: "${result.title}"`);
        }
        console.log('');

        return result;
      } catch (error) {
        console.error('[Test] ❌ Script evaluation failed:', error.message);
        throw error;
      }
    },

    async screenshot() {
      try {
        console.log('[Test] 📸 Taking screenshot...');
        const screenshot = await page.screenshot({
          fullPage: false,
          type: 'png'
        });
        console.log('[Test] ✅ Screenshot captured\n');
        return screenshot;
      } catch (error) {
        console.warn('[Test] ⚠️  Screenshot failed (optional):', error.message);
        return null;
      }
    },

    async close() {
      try {
        console.log('[Test] 🔒 Closing browser...');
        await browser.close();
        console.log('[Test] ✅ Browser closed successfully\n');
      } catch (error) {
        console.warn('[Test] ⚠️  Browser close warning:', error.message);
      }
    }
  };
}

/**
 * Test product extraction with a real company website
 */
async function testProductExtraction(domain) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 PUPPETEER PRODUCT EXTRACTION TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`🎯 Target Domain: ${domain}`);
  console.log(`🌐 URL: https://${domain}\n`);

  const overallStartTime = Date.now();
  let browserWrapper = null;

  try {
    // Create browser wrapper
    browserWrapper = await createBrowserWrapper();

    // Extract product details
    console.log('[Test] 🤖 Starting AI-powered product extraction...\n');
    const extractionStartTime = Date.now();

    const productDetails = await extractProductDetailsFromDomain(domain, browserWrapper);

    const extractionTime = Date.now() - extractionStartTime;

    // Display results
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 EXTRACTION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (productDetails.fallback) {
      console.log('⚠️  FALLBACK MODE (Extraction Failed)');
      console.log(`❌ Error: ${productDetails.error || 'Unknown error'}\n`);
      console.log('This means the extraction service returned fallback data.');
      console.log('User would see an empty form and fill it manually.\n');
    } else {
      console.log('✅ EXTRACTION SUCCESSFUL!\n');

      console.log('Product Details:');
      console.log('─────────────────────────────────────────────────────────');
      console.log(`📦 Product Name: ${productDetails.productName}`);
      console.log(`📝 Description: ${productDetails.description}`);
      console.log(`✨ Distinguishing Feature: ${productDetails.distinguishingFeature}`);
      console.log(`💼 Business Model: ${productDetails.businessModel}`);
      console.log(`🔗 Source URL: ${productDetails.sourceUrl}`);
      console.log(`📅 Extracted At: ${productDetails.extractedAt}`);
      console.log('─────────────────────────────────────────────────────────\n');
    }

    // Performance metrics
    const totalTime = Date.now() - overallStartTime;
    console.log('⏱️  Performance Metrics:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`Extraction Time: ${extractionTime}ms (${(extractionTime / 1000).toFixed(2)}s)`);
    console.log(`Extraction Time (from result): ${productDetails.extractionTimeMs || 'N/A'}ms`);
    console.log('─────────────────────────────────────────────────────────\n');

    // Success/Failure verdict
    if (productDetails.fallback) {
      console.log('🔴 TEST RESULT: FAILED (Fallback Mode)');
      console.log('The extraction did not produce valid product details.\n');
    } else {
      console.log('🟢 TEST RESULT: PASSED');
      console.log('Product details extracted successfully!\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');

    return productDetails;

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error('═══════════════════════════════════════════════════════════\n');

    throw error;

  } finally {
    // Always close browser
    if (browserWrapper) {
      await browserWrapper.close();
    }
  }
}

// Run test with command-line argument or default to greptile.com
const testDomain = process.argv[2] || 'greptile.com';

testProductExtraction(testDomain)
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
