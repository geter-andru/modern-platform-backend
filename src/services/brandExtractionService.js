/**
 * Brand Asset Extraction Service
 *
 * Extracts company logos and brand colors from websites using Playwright MCP.
 * Used to create branded PDF exports with customer logos and colors.
 *
 * @module services/brandExtractionService
 */

import logger from '../utils/logger.js';

/**
 * Extract logo URL from website DOM
 * Attempts to find logo in common locations and patterns
 */
const LOGO_EXTRACTION_SCRIPT = `
(() => {
  const logoSources = [];

  // Strategy 1: Look for images with common logo-related attributes
  const logoSelectors = [
    'img[alt*="logo" i]',
    'img[class*="logo" i]',
    'img[id*="logo" i]',
    'img[src*="logo" i]',
    'a[class*="logo" i] img',
    'a[id*="logo" i] img',
    'header img',
    'nav img',
    '.header img',
    '.navbar img',
    '.site-logo img',
    '.brand img'
  ];

  for (const selector of logoSelectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const src = el.src || el.getAttribute('src');
      if (src && !logoSources.includes(src)) {
        logoSources.push({
          type: 'img',
          src: src,
          alt: el.alt || '',
          width: el.width || el.naturalWidth,
          height: el.height || el.naturalHeight,
          selector: selector
        });
      }
    });
  }

  // Strategy 2: Look for SVG logos
  const svgSelectors = [
    'svg[class*="logo" i]',
    'svg[id*="logo" i]',
    'a[class*="logo" i] svg',
    'header svg',
    'nav svg'
  ];

  for (const selector of svgSelectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const outerHTML = el.outerHTML;
      if (outerHTML) {
        logoSources.push({
          type: 'svg',
          svg: outerHTML,
          width: el.width?.baseVal?.value || el.getBoundingClientRect().width,
          height: el.height?.baseVal?.value || el.getBoundingClientRect().height,
          selector: selector
        });
      }
    });
  }

  // Strategy 3: Check for CSS background images on common logo containers
  const bgSelectors = [
    '.logo',
    '#logo',
    '.site-logo',
    '.brand',
    'a[class*="logo" i]'
  ];

  for (const selector of bgSelectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
        if (urlMatch && urlMatch[1]) {
          logoSources.push({
            type: 'background',
            src: urlMatch[1],
            selector: selector,
            width: el.offsetWidth,
            height: el.offsetHeight
          });
        }
      }
    });
  }

  return logoSources;
})();
`;

/**
 * Extract brand colors from website
 * Analyzes CSS variables, meta tags, and computed styles
 */
const COLOR_EXTRACTION_SCRIPT = `
(() => {
  const colors = new Set();

  // Strategy 1: CSS Variables (most modern sites)
  const rootStyles = getComputedStyle(document.documentElement);
  const cssVariables = [
    '--primary-color',
    '--primary',
    '--brand-color',
    '--brand',
    '--theme-color',
    '--color-primary',
    '--accent-color',
    '--main-color'
  ];

  cssVariables.forEach(varName => {
    const value = rootStyles.getPropertyValue(varName).trim();
    if (value) colors.add(value);
  });

  // Strategy 2: Meta theme-color tag
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const color = metaTheme.getAttribute('content');
    if (color) colors.add(color);
  }

  // Strategy 3: Primary button colors (common brand color location)
  const buttonSelectors = [
    'button[class*="primary" i]',
    'a[class*="primary" i]',
    '.btn-primary',
    '.button-primary',
    '[class*="cta" i]'
  ];

  buttonSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const bgColor = style.backgroundColor;
      const color = style.color;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') colors.add(bgColor);
      if (color) colors.add(color);
    });
  });

  // Strategy 4: Header/Navigation background colors
  const headerSelectors = ['header', 'nav', '.header', '.navbar'];
  headerSelectors.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) {
      const style = window.getComputedStyle(el);
      const bgColor = style.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') colors.add(bgColor);
    }
  });

  // Convert Set to Array and filter out common non-brand colors
  const colorArray = Array.from(colors);
  const filtered = colorArray.filter(color => {
    // Filter out pure white, pure black, transparent
    if (color === 'rgb(255, 255, 255)') return false;
    if (color === 'rgb(0, 0, 0)') return false;
    if (color === 'rgba(0, 0, 0, 0)') return false;
    if (color.includes('transparent')) return false;
    return true;
  });

  return filtered;
})();
`;

class BrandExtractionService {
  /**
   * Extract brand assets from a company website
   *
   * @param {string} websiteUrl - Company website URL
   * @param {Object} mcpTools - MCP tool functions (playwright)
   * @returns {Promise<Object>} Extracted brand assets
   */
  async extractBrandAssets(websiteUrl, mcpTools = null) {
    logger.info(`[BrandExtraction] Starting extraction for: ${websiteUrl}`);

    try {
      // Normalize URL
      const url = this.normalizeUrl(websiteUrl);

      // Check if MCP tools are available
      if (!mcpTools) {
        logger.warn('[BrandExtraction] MCP tools not provided, using fallback');
        return this.getFallbackBrandAssets(url);
      }

      // Step 1: Navigate to website
      logger.info(`[BrandExtraction] Navigating to: ${url}`);
      await mcpTools.navigate(url);

      // Wait for page to load
      await this.sleep(2000);

      // Step 2: Take screenshot for visual analysis
      logger.info('[BrandExtraction] Capturing screenshot...');
      const screenshot = await mcpTools.screenshot();

      // Step 3: Extract logo URLs from DOM
      logger.info('[BrandExtraction] Extracting logo URLs...');
      const logoData = await mcpTools.evaluate(LOGO_EXTRACTION_SCRIPT);

      // Step 4: Extract brand colors from CSS
      logger.info('[BrandExtraction] Extracting brand colors...');
      const colorData = await mcpTools.evaluate(COLOR_EXTRACTION_SCRIPT);

      // Step 5: Process and rank results
      const processedAssets = this.processBrandAssets(
        logoData,
        colorData,
        url,
        screenshot
      );

      logger.info('[BrandExtraction] Extraction complete', {
        logoCount: processedAssets.logos.length,
        colorCount: processedAssets.colors.length,
        hasScreenshot: !!processedAssets.screenshot
      });

      return processedAssets;

    } catch (error) {
      logger.error('[BrandExtraction] Extraction failed', {
        url: websiteUrl,
        error: error.message,
        stack: error.stack
      });

      // Return fallback assets on error
      return this.getFallbackBrandAssets(websiteUrl);
    }
  }

  /**
   * Process and rank extracted brand assets
   */
  processBrandAssets(logoData, colorData, baseUrl, screenshot) {
    // Process logos: convert relative URLs to absolute, rank by likelihood
    const logos = (logoData || [])
      .map(logo => ({
        ...logo,
        src: logo.src ? this.resolveUrl(logo.src, baseUrl) : null,
        score: this.scoreLogoCandidate(logo)
      }))
      .filter(logo => logo.src || logo.svg) // Must have source
      .sort((a, b) => b.score - a.score); // Highest score first

    // Process colors: convert to hex, deduplicate
    let colors = (colorData || [])
      .map(color => this.normalizeColor(color))
      .filter((color, index, arr) => arr.indexOf(color) === index) // Unique
      .slice(0, 5); // Top 5 colors

    // IMPORTANT: Always return minimum 2 colors for primary/secondary branding
    colors = this.ensureMinimumTwoColors(colors);

    return {
      logos: logos.slice(0, 3), // Top 3 logo candidates
      colors: colors,
      screenshot: screenshot || null,
      extractedAt: new Date().toISOString(),
      sourceUrl: baseUrl
    };
  }

  /**
   * Score logo candidate based on attributes
   * Higher score = more likely to be the actual logo
   */
  scoreLogoCandidate(logo) {
    let score = 0;

    // Prefer images over SVGs over backgrounds
    if (logo.type === 'img') score += 30;
    if (logo.type === 'svg') score += 25;
    if (logo.type === 'background') score += 15;

    // Prefer logos in header/nav
    if (logo.selector?.includes('header') || logo.selector?.includes('nav')) {
      score += 20;
    }

    // Prefer specific logo selectors
    if (logo.selector?.includes('logo')) score += 25;
    if (logo.selector?.includes('brand')) score += 15;

    // Prefer reasonable dimensions (not too small, not too large)
    const width = logo.width || 0;
    const height = logo.height || 0;
    if (width >= 100 && width <= 500 && height >= 30 && height <= 200) {
      score += 15;
    }

    // Prefer images with "logo" in alt text
    if (logo.alt && logo.alt.toLowerCase().includes('logo')) {
      score += 10;
    }

    return score;
  }

  /**
   * Normalize URL (add protocol if missing)
   */
  normalizeUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  /**
   * Resolve relative URL to absolute
   */
  resolveUrl(url, baseUrl) {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  /**
   * Normalize color to hex format
   */
  normalizeColor(color) {
    // If already hex, return as-is
    if (color.startsWith('#')) return color.toUpperCase();

    // Convert rgb/rgba to hex
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    }

    return color;
  }

  /**
   * Ensure minimum 2 colors for primary/secondary branding
   * - 0 colors → use default fallback colors
   * - 1 color → generate lighter shade as secondary
   * - 2+ colors → return as-is
   */
  ensureMinimumTwoColors(colors) {
    // If we have 2+ colors, return as-is
    if (colors.length >= 2) {
      return colors;
    }

    // If we have 1 color, generate a lighter shade as secondary
    if (colors.length === 1) {
      const primaryColor = colors[0];
      const secondaryColor = this.generateLighterShade(primaryColor);
      logger.info(`[BrandExtraction] Generated secondary color ${secondaryColor} from primary ${primaryColor}`);
      return [primaryColor, secondaryColor];
    }

    // If we have 0 colors, use default fallback
    logger.warn('[BrandExtraction] No colors extracted, using default fallback colors');
    return ['#4F46E5', '#818CF8']; // Default purple brand colors
  }

  /**
   * Generate a lighter shade of a color (for secondary branding)
   * Increases lightness by 20-30% while preserving hue
   */
  generateLighterShade(hexColor) {
    // Remove # and parse RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Convert to HSL to adjust lightness
    const [h, s, l] = this.rgbToHsl(r, g, b);

    // Increase lightness by 25% (capped at 90% to avoid white)
    const newL = Math.min(l + 0.25, 0.9);

    // Convert back to RGB
    const [newR, newG, newB] = this.hslToRgb(h, s, newL);

    // Convert to hex
    return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1).toUpperCase()}`;
  }

  /**
   * Convert RGB to HSL
   * Returns [h, s, l] where h is 0-360, s and l are 0-1
   */
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return [h * 360, s, l];
  }

  /**
   * Convert HSL to RGB
   * h is 0-360, s and l are 0-1
   * Returns [r, g, b] where values are 0-255
   */
  hslToRgb(h, s, l) {
    h /= 360;
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Get fallback brand assets when extraction fails
   */
  getFallbackBrandAssets(url) {
    logger.warn(`[BrandExtraction] Using fallback assets for: ${url}`);

    return {
      logos: [],
      colors: ['#4F46E5', '#818CF8'], // Default purple brand colors
      screenshot: null,
      extractedAt: new Date().toISOString(),
      sourceUrl: url,
      fallback: true
    };
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new BrandExtractionService();
