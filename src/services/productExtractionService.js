/**
 * Product Extraction Service
 *
 * Automatically extracts product information from company websites using:
 * 1. Playwright MCP for browser automation (navigation, scraping)
 * 2. Claude AI for intelligent extraction and structuring
 *
 * Triggered on user signup to pre-fill product details form.
 *
 * @module services/productExtractionService
 */

import aiService from './aiService.js';
import logger from '../utils/logger.js';

/**
 * Extract product details from a company domain
 *
 * @param {string} domain - Company domain (e.g., 'greptile.com')
 * @param {Object} mcpWrapper - MCP browser wrapper (Playwright or Puppeteer)
 * @returns {Promise<Object>} Product details or fallback object
 *
 * @example
 * const result = await extractProductDetailsFromDomain('greptile.com', mcpWrapper);
 * // {
 * //   productName: "Greptile",
 * //   description: "AI-powered code search and navigation",
 * //   distinguishingFeature: "Natural language code search across repositories",
 * //   businessModel: "B2B SaaS",
 * //   sourceUrl: "https://greptile.com",
 * //   extractedAt: "2025-11-01T...",
 * //   fallback: false
 * // }
 */
export async function extractProductDetailsFromDomain(domain, mcpWrapper) {
  const startTime = Date.now();

  logger.info('[ProductExtraction] Starting extraction', { domain });

  try {
    // Validate inputs
    if (!domain || typeof domain !== 'string') {
      throw new Error('Invalid domain provided');
    }

    if (!mcpWrapper) {
      throw new Error('MCP wrapper not provided');
    }

    // Normalize domain (remove protocol, www, trailing slash)
    const normalizedDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');

    const url = `https://${normalizedDomain}`;

    // Step 1: Navigate to company website
    logger.info('[ProductExtraction] Navigating to URL', { url });

    await mcpWrapper.navigate(url);

    // Step 2: Extract page content
    logger.info('[ProductExtraction] Extracting page content');

    // Get visible text from page (first 5000 chars to stay within token limits)
    const pageText = await mcpWrapper.evaluate(`
      (() => {
        // Get main content, excluding nav/footer
        const main = document.querySelector('main') || document.body;
        return main.innerText.substring(0, 5000);
      })()
    `);

    // Get meta description
    const metaDescription = await mcpWrapper.evaluate(`
      (() => {
        const meta = document.querySelector('meta[name="description"]');
        return meta ? meta.content : '';
      })()
    `);

    // Get page title
    const pageTitle = await mcpWrapper.evaluate(`
      document.title
    `);

    // Get h1 headings (often contain product name)
    const headings = await mcpWrapper.evaluate(`
      (() => {
        const h1s = Array.from(document.querySelectorAll('h1'));
        return h1s.map(h => h.innerText).slice(0, 3).join(' | ');
      })()
    `);

    // Step 3: Take screenshot for visual analysis (optional, not used yet)
    // const screenshot = await mcpWrapper.screenshot();

    // Step 4: Close browser to free resources
    await mcpWrapper.close();

    logger.info('[ProductExtraction] Page content extracted', {
      pageTextLength: pageText?.length || 0,
      metaDescriptionLength: metaDescription?.length || 0,
      pageTitle
    });

    // Step 5: Use Claude AI to extract structured product information
    const aiPrompt = buildExtractionPrompt(url, {
      pageTitle,
      metaDescription,
      headings,
      pageText
    });

    logger.info('[ProductExtraction] Calling Claude AI for structured extraction');

    const aiResponse = await aiService.callAnthropicAPI(aiPrompt, {
      max_tokens: 1000,
      temperature: 0.3 // Lower temperature for factual extraction
    });

    // Parse AI response
    let extracted;
    try {
      // Extract JSON from AI response (handles both pure JSON and text with JSON)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      extracted = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.error('[ProductExtraction] Failed to parse AI response', {
        error: parseError.message,
        response: aiResponse?.substring(0, 500)
      });
      throw new Error('AI response parsing failed');
    }

    // Validate extracted data
    if (!extracted.productName) {
      throw new Error('Product name not extracted');
    }

    // Validate and normalize business model (must be one of the two allowed values)
    const validBusinessModels = ['b2b-subscription', 'b2b-one-time'];
    let businessModel = extracted.businessModel;

    if (!validBusinessModels.includes(businessModel)) {
      logger.warn('[ProductExtraction] Invalid business model extracted, defaulting to b2b-subscription', {
        extractedValue: businessModel
      });
      businessModel = 'b2b-subscription'; // Default to subscription model
    }

    const result = {
      productName: extracted.productName || 'Unknown',
      description: extracted.description || '',
      distinguishingFeature: extracted.distinguishingFeature || '',
      businessModel: businessModel,
      sourceUrl: url,
      extractedAt: new Date().toISOString(),
      fallback: false,
      extractionTimeMs: Date.now() - startTime
    };

    logger.info('[ProductExtraction] Extraction successful', {
      domain,
      productName: result.productName,
      extractionTimeMs: result.extractionTimeMs
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('[ProductExtraction] Extraction failed', {
      domain,
      error: error.message,
      stack: error.stack,
      durationMs: duration
    });

    // Silent fallback - return fallback object (empty form)
    return {
      fallback: true,
      error: error.message,
      extractedAt: new Date().toISOString(),
      extractionTimeMs: duration
    };
  }
}

/**
 * Build AI prompt for product information extraction
 *
 * @param {string} url - Company website URL
 * @param {Object} content - Extracted page content
 * @returns {string} Formatted prompt for Claude
 */
function buildExtractionPrompt(url, content) {
  return `You are analyzing a company website to extract product information for a B2B SaaS ICP analysis tool.

Website URL: ${url}
Page Title: ${content.pageTitle}
Meta Description: ${content.metaDescription}
Main Headings: ${content.headings}

Page Content:
${content.pageText}

Extract the following information and return ONLY valid JSON (no markdown, no explanation):

{
  "productName": "Exact product or company name (not tagline)",
  "description": "1-2 sentence description of what the product does",
  "distinguishingFeature": "What makes this product unique or different from competitors",
  "businessModel": "b2b-subscription OR b2b-one-time"
}

Rules:
1. Use the company's own language and terminology (don't paraphrase)
2. Be concise and factual (no marketing fluff)
3. If something is unclear, use "Unknown" for that field
4. Focus on the PRIMARY product if multiple products exist
5. For productName: Use proper capitalization (e.g., "Stripe", not "stripe")
6. For description: Keep under 150 characters
7. For businessModel: You MUST choose EXACTLY one of these values:
   - "b2b-subscription" - for recurring subscription products (SaaS, monthly/annual billing)
   - "b2b-one-time" - for one-time purchase products (perpetual licenses, one-time fees)
   Default to "b2b-subscription" for most SaaS products
8. Return ONLY the JSON object, nothing else

JSON:`;
}

/**
 * Validate product details structure
 *
 * @param {Object} productDetails - Product details to validate
 * @returns {boolean} True if valid
 */
export function validateProductDetails(productDetails) {
  if (!productDetails || typeof productDetails !== 'object') {
    return false;
  }

  // Fallback objects are valid (empty form)
  if (productDetails.fallback === true) {
    return true;
  }

  // Non-fallback must have required fields
  const required = ['productName', 'description', 'sourceUrl'];

  for (const field of required) {
    if (!productDetails[field]) {
      return false;
    }
  }

  return true;
}

/**
 * Create MCP browser wrapper for Playwright/Puppeteer
 * Tries Playwright first, falls back to Puppeteer
 *
 * Note: This is a placeholder. In production, MCP tools would be
 * injected from the environment/context where they're available.
 *
 * @returns {Object} MCP wrapper with navigate, evaluate, screenshot, close methods
 */
export function createMCPWrapper() {
  return {
    /**
     * Navigate to URL
     * @param {string} url - URL to navigate to
     */
    async navigate(url) {
      // In production, this would call:
      // await mcp__playwright__playwright_navigate({ url })
      // or
      // await mcp__puppeteer__puppeteer_navigate({ url })

      logger.warn('[MCPWrapper] Using mock navigate - MCP not available');
      throw new Error('MCP tools not available - unable to navigate');
    },

    /**
     * Evaluate JavaScript on page
     * @param {string} script - JavaScript to evaluate
     * @returns {Promise<any>} Result of evaluation
     */
    async evaluate(script) {
      // In production:
      // await mcp__playwright__playwright_evaluate({ script })

      logger.warn('[MCPWrapper] Using mock evaluate - MCP not available');
      throw new Error('MCP tools not available - unable to evaluate');
    },

    /**
     * Take screenshot of page
     * @returns {Promise<string>} Base64 encoded screenshot
     */
    async screenshot() {
      // In production:
      // await mcp__playwright__playwright_screenshot({})

      logger.warn('[MCPWrapper] Using mock screenshot - MCP not available');
      return null; // Optional, so return null instead of throwing
    },

    /**
     * Close browser session
     */
    async close() {
      // In production:
      // await mcp__playwright__playwright_close({})

      logger.info('[MCPWrapper] Mock close called');
      // Silent success for close
    }
  };
}

export default {
  extractProductDetailsFromDomain,
  validateProductDetails,
  createMCPWrapper
};
