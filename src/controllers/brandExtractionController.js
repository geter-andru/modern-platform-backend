/**
 * Brand Extraction Controller
 *
 * API endpoints for extracting brand assets (logos, colors) from company websites.
 * Uses Playwright/Puppeteer MCP for browser automation.
 *
 * @module controllers/brandExtractionController
 */

import brandExtractionService from '../services/brandExtractionService.js';
import supabaseDataService from '../services/supabaseDataService.js';
import logger from '../utils/logger.js';

/**
 * MCP Browser Wrapper
 * Abstracts Playwright/Puppeteer MCP tools
 */
class MCPBrowserWrapper {
  constructor(mcpToolName = 'puppeteer') {
    this.toolName = mcpToolName;
  }

  /**
   * Get MCP tool functions based on available tools
   * Note: This will be called with actual MCP tools from the environment
   */
  async navigate(url, mcpInvoke) {
    // Try Puppeteer first (more likely to be available)
    try {
      return await mcpInvoke('mcp__puppeteer__puppeteer_navigate', { url });
    } catch (error) {
      // Fallback to Playwright if available
      try {
        return await mcpInvoke('mcp__playwright__playwright_navigate', { url });
      } catch (fallbackError) {
        throw new Error('No browser automation MCP available (tried Puppeteer and Playwright)');
      }
    }
  }

  async screenshot(mcpInvoke) {
    try {
      return await mcpInvoke('mcp__puppeteer__puppeteer_screenshot', {});
    } catch (error) {
      try {
        return await mcpInvoke('mcp__playwright__playwright_screenshot', {});
      } catch (fallbackError) {
        throw new Error('Screenshot failed: No MCP available');
      }
    }
  }

  async evaluate(script, mcpInvoke) {
    try {
      return await mcpInvoke('mcp__puppeteer__puppeteer_evaluate', { script });
    } catch (error) {
      try {
        return await mcpInvoke('mcp__playwright__playwright_evaluate', { script });
      } catch (fallbackError) {
        throw new Error('Evaluate failed: No MCP available');
      }
    }
  }

  async close(mcpInvoke) {
    try {
      await mcpInvoke('mcp__puppeteer__puppeteer_close', {});
    } catch (error) {
      try {
        await mcpInvoke('mcp__playwright__playwright_close', {});
      } catch (fallbackError) {
        // Ignore close errors
        logger.warn('[MCPBrowser] Close failed (may already be closed)');
      }
    }
  }
}

/**
 * Extract brand assets from a website
 * POST /api/brand-extraction
 *
 * Body:
 * {
 *   "websiteUrl": "stripe.com",
 *   "customerId": "user-id-123" (optional - to store with customer)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "brandAssets": {
 *     "logos": [...],
 *     "colors": [...],
 *     "screenshot": "base64...",
 *     "extractedAt": "2025-11-01T...",
 *     "sourceUrl": "https://stripe.com"
 *   }
 * }
 */
export const extractBrandAssets = async (req, res, next) => {
  try {
    const { websiteUrl, customerId } = req.body;
    const userId = req.user?.id;

    logger.info('[BrandExtractionController] Extract request', {
      userId,
      websiteUrl,
      customerId
    });

    // Validate URL
    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        error: 'websiteUrl is required'
      });
    }

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // TODO: Create MCP wrapper that will be injected with actual MCP tools
    // For now, we'll use fallback (no browser automation)
    // In production, this would be:
    // const mcpWrapper = new MCPBrowserWrapper();
    // const brandAssets = await brandExtractionService.extractBrandAssets(websiteUrl, mcpWrapper);

    // For now, return fallback
    logger.warn('[BrandExtractionController] MCP tools not available, using fallback');
    const brandAssets = await brandExtractionService.extractBrandAssets(websiteUrl, null);

    // Optionally store with customer
    if (customerId && customerId === userId) {
      try {
        await supabaseDataService.updateCustomer(customerId, {
          brand_assets: JSON.stringify(brandAssets),
          brand_assets_updated_at: new Date().toISOString()
        });
        logger.info('[BrandExtractionController] Brand assets stored with customer', {
          customerId
        });
      } catch (storeError) {
        logger.error('[BrandExtractionController] Failed to store brand assets', {
          error: storeError.message
        });
        // Don't fail the request if storage fails
      }
    }

    res.status(200).json({
      success: true,
      brandAssets,
      message: brandAssets.fallback
        ? 'Brand extraction unavailable (using default colors)'
        : 'Brand assets extracted successfully'
    });

  } catch (error) {
    logger.error('[BrandExtractionController] Extract failed', {
      error: error.message,
      stack: error.stack
    });

    next(error);
  }
};

/**
 * Get stored brand assets for a customer
 * GET /api/brand-extraction/:customerId
 */
export const getBrandAssets = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const userId = req.user?.id;

    logger.info('[BrandExtractionController] Get brand assets', {
      userId,
      customerId
    });

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Security: Only allow users to access their own brand assets
    if (customerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get customer data
    const customer = await supabaseDataService.getCustomerById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Parse brand assets
    let brandAssets = null;
    if (customer.brand_assets) {
      try {
        brandAssets = JSON.parse(customer.brand_assets);
      } catch (parseError) {
        logger.warn('[BrandExtractionController] Failed to parse brand assets', {
          error: parseError.message
        });
      }
    }

    if (!brandAssets) {
      return res.status(404).json({
        success: false,
        error: 'No brand assets found for this customer'
      });
    }

    res.status(200).json({
      success: true,
      brandAssets,
      updatedAt: customer.brand_assets_updated_at || null
    });

  } catch (error) {
    logger.error('[BrandExtractionController] Get brand assets failed', {
      error: error.message,
      stack: error.stack
    });

    next(error);
  }
};

export default {
  extractBrandAssets,
  getBrandAssets
};
