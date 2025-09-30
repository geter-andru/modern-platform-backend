/**
 * Company Research Controller
 * Provides REAL company intelligence gathering from multiple sources
 * Includes caching strategy for efficient data retrieval
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../utils/logger.js';

// In-memory cache for now (will be replaced with Redis)
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Research a company and gather comprehensive business intelligence
 */
export const researchCompany = async (req, res, next) => {
  try {
    const { companyName, depth = 'comprehensive', forceRefresh = false } = req.body;

    // Validate input
    if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Valid company name is required (minimum 2 characters)'
      });
    }

    const cleanCompanyName = companyName.trim();
    const cacheKey = `company:${cleanCompanyName.toLowerCase()}:${depth}`;

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        logger.info(`Cache hit for company: ${cleanCompanyName}`);
        return res.json({
          success: true,
          data: cached.data,
          fromCache: true,
          cacheAge: Date.now() - cached.timestamp
        });
      }
    }

    logger.info(`Starting comprehensive research for company: ${cleanCompanyName}`);

    // Initialize company data structure
    const companyData = {
      company: {
        name: cleanCompanyName,
        normalizedName: cleanCompanyName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        aliases: []
      },
      profile: {
        description: null,
        industry: null,
        subIndustry: null,
        headquarters: null,
        founded: null,
        website: null,
        socialProfiles: {
          linkedin: null,
          twitter: null,
          facebook: null
        }
      },
      metrics: {
        employees: {
          count: null,
          range: null,
          growth: null,
          growthRate: null
        },
        revenue: {
          amount: null,
          range: null,
          currency: 'USD',
          year: null,
          growth: null
        },
        funding: {
          total: null,
          lastRound: null,
          lastRoundDate: null,
          lastRoundAmount: null,
          investors: [],
          stage: null
        },
        valuation: null
      },
      market: {
        customers: {
          segments: [],
          notable: [],
          count: null,
          geography: []
        },
        competitors: [],
        marketSize: null,
        marketShare: null,
        positioning: null,
        differentiators: []
      },
      technology: {
        stack: [],
        platforms: [],
        integrations: [],
        apis: [],
        patents: null,
        certifications: []
      },
      operations: {
        offices: [],
        globalPresence: false,
        remoteFirst: false,
        businessModel: null,
        revenueModel: null
      },
      signals: {
        growth: {
          hiring: false,
          expansion: false,
          newProducts: false,
          partnerships: []
        },
        risk: {
          layoffs: false,
          lawsuits: false,
          negativePress: false,
          competitorPressure: false
        },
        opportunity: {
          recentFunding: false,
          newLeadership: false,
          productLaunch: false,
          marketExpansion: false
        }
      },
      news: {
        recent: [],
        sentiment: 'neutral'
      },
      assessment: {
        tier: null,
        score: null,
        strengths: [],
        weaknesses: [],
        recommendedApproach: null,
        estimatedDealSize: null,
        salesCycleEstimate: null
      },
      metadata: {
        researchDate: new Date().toISOString(),
        dataQuality: 0,
        sources: [],
        confidence: 0
      }
    };

    // Track data collection success
    let dataPoints = 0;
    let totalAttempts = 0;

    // 1. BASIC COMPANY SEARCH
    try {
      totalAttempts++;
      const searchQuery = `${cleanCompanyName} company overview profile about`;
      const searchResults = await performWebSearch(searchQuery);
      
      if (searchResults && searchResults.length > 0) {
        const overviewText = searchResults.map(r => r.snippet).join(' ').toLowerCase();
        
        // Extract industry
        const industries = [
          'software', 'saas', 'fintech', 'healthtech', 'edtech', 'martech',
          'retail', 'ecommerce', 'manufacturing', 'logistics', 'real estate',
          'insurance', 'banking', 'consulting', 'healthcare', 'biotech',
          'automotive', 'energy', 'telecommunications', 'media', 'entertainment'
        ];
        
        for (const industry of industries) {
          if (overviewText.includes(industry)) {
            companyData.profile.industry = industry.charAt(0).toUpperCase() + industry.slice(1);
            dataPoints++;
            break;
          }
        }
        
        // Extract headquarters location
        const cities = [
          'san francisco', 'new york', 'boston', 'seattle', 'austin', 'chicago',
          'los angeles', 'denver', 'atlanta', 'miami', 'dallas', 'houston',
          'london', 'paris', 'berlin', 'amsterdam', 'dublin', 'zurich',
          'singapore', 'tokyo', 'sydney', 'toronto', 'vancouver'
        ];
        
        for (const city of cities) {
          if (overviewText.includes(city)) {
            companyData.profile.headquarters = city.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            dataPoints++;
            break;
          }
        }
        
        // Extract founding year
        const yearMatch = overviewText.match(/founded.{0,15}(19\d{2}|20\d{2})/);
        if (yearMatch) {
          companyData.profile.founded = parseInt(yearMatch[1]);
          dataPoints++;
        }
        
        // Set description from first result
        if (searchResults[0]) {
          companyData.profile.description = searchResults[0].snippet.substring(0, 250);
          dataPoints++;
        }
        
        companyData.metadata.sources.push('Web Search - Overview');
      }
    } catch (error) {
      logger.warn(`Basic search failed for ${cleanCompanyName}:`, error.message);
    }

    // 2. EMPLOYEE & SIZE INFORMATION
    if (depth === 'comprehensive' || depth === 'deep') {
      try {
        totalAttempts++;
        const sizeQuery = `${cleanCompanyName} number employees team size headcount linkedin`;
        const sizeResults = await performWebSearch(sizeQuery);
        
        if (sizeResults && sizeResults.length > 0) {
          const sizeText = sizeResults.map(r => r.snippet).join(' ');
          
          // Extract employee count
          const employeePatterns = [
            /(\d{1,3},?\d{0,3})\+?\s*employees/i,
            /(\d{1,3},?\d{0,3})\s*people/i,
            /team of\s*(\d{1,3},?\d{0,3})/i,
            /headcount.{0,10}(\d{1,3},?\d{0,3})/i
          ];
          
          for (const pattern of employeePatterns) {
            const match = sizeText.match(pattern);
            if (match) {
              const count = parseInt(match[1].replace(',', ''));
              companyData.metrics.employees.count = count;
              
              // Determine employee range
              if (count <= 10) {
                companyData.metrics.employees.range = '1-10';
                companyData.market.positioning = 'Startup';
              } else if (count <= 50) {
                companyData.metrics.employees.range = '11-50';
                companyData.market.positioning = 'Early Stage';
              } else if (count <= 200) {
                companyData.metrics.employees.range = '51-200';
                companyData.market.positioning = 'Growth Stage';
              } else if (count <= 1000) {
                companyData.metrics.employees.range = '201-1000';
                companyData.market.positioning = 'Scale-up';
              } else if (count <= 5000) {
                companyData.metrics.employees.range = '1001-5000';
                companyData.market.positioning = 'Mid-Market';
              } else {
                companyData.metrics.employees.range = '5000+';
                companyData.market.positioning = 'Enterprise';
              }
              
              dataPoints += 2;
              break;
            }
          }
          
          // Look for growth indicators
          if (sizeText.includes('growing') || sizeText.includes('hiring') || sizeText.includes('expanding')) {
            companyData.metrics.employees.growth = 'Growing';
            companyData.signals.growth.hiring = true;
            dataPoints++;
          }
          
          companyData.metadata.sources.push('Web Search - Company Size');
        }
      } catch (error) {
        logger.warn(`Size search failed for ${cleanCompanyName}:`, error.message);
      }
    }

    // 3. FUNDING & FINANCIAL INFORMATION
    try {
      totalAttempts++;
      const fundingQuery = `${cleanCompanyName} funding raised investment series revenue valuation`;
      const fundingResults = await performWebSearch(fundingQuery);
      
      if (fundingResults && fundingResults.length > 0) {
        const fundingText = fundingResults.map(r => r.snippet).join(' ');
        
        // Extract funding information
        const fundingPatterns = [
          /raised\s*\$?([\d.]+)\s*(million|billion|M|B)/i,
          /funding.{0,10}\$?([\d.]+)\s*(million|billion|M|B)/i,
          /\$?([\d.]+)\s*(million|billion|M|B).{0,10}funding/i
        ];
        
        for (const pattern of fundingPatterns) {
          const match = fundingText.match(pattern);
          if (match) {
            const amount = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            const multiplier = unit.startsWith('b') ? 1000 : 1;
            companyData.metrics.funding.total = amount * multiplier;
            dataPoints++;
            
            // Recent funding signal
            if (fundingText.includes('2024') || fundingText.includes('2025') || fundingText.includes('recent')) {
              companyData.signals.opportunity.recentFunding = true;
              dataPoints++;
            }
            break;
          }
        }
        
        // Extract funding stage
        const stageMatch = fundingText.match(/series\s*([A-E])/i);
        if (stageMatch) {
          companyData.metrics.funding.stage = `Series ${stageMatch[1].toUpperCase()}`;
          companyData.metrics.funding.lastRound = `Series ${stageMatch[1].toUpperCase()}`;
          dataPoints++;
        } else if (fundingText.includes('seed')) {
          companyData.metrics.funding.stage = 'Seed';
          dataPoints++;
        } else if (fundingText.includes('pre-seed')) {
          companyData.metrics.funding.stage = 'Pre-Seed';
          dataPoints++;
        }
        
        // Extract revenue information
        const revenuePatterns = [
          /revenue.{0,10}\$?([\d.]+)\s*(million|billion|M|B)/i,
          /\$?([\d.]+)\s*(million|billion|M|B).{0,10}revenue/i,
          /annual.{0,10}\$?([\d.]+)\s*(million|billion|M|B)/i
        ];
        
        for (const pattern of revenuePatterns) {
          const match = fundingText.match(pattern);
          if (match) {
            const amount = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            const multiplier = unit.startsWith('b') ? 1000 : 1;
            companyData.metrics.revenue.amount = amount * multiplier;
            
            // Determine revenue range
            const revenue = amount * multiplier;
            if (revenue < 1) {
              companyData.metrics.revenue.range = '<$1M';
            } else if (revenue < 10) {
              companyData.metrics.revenue.range = '$1M-$10M';
            } else if (revenue < 50) {
              companyData.metrics.revenue.range = '$10M-$50M';
            } else if (revenue < 100) {
              companyData.metrics.revenue.range = '$50M-$100M';
            } else if (revenue < 500) {
              companyData.metrics.revenue.range = '$100M-$500M';
            } else {
              companyData.metrics.revenue.range = '$500M+';
            }
            
            dataPoints += 2;
            break;
          }
        }
        
        companyData.metadata.sources.push('Web Search - Funding & Financials');
      }
    } catch (error) {
      logger.warn(`Funding search failed for ${cleanCompanyName}:`, error.message);
    }

    // 4. TECHNOLOGY STACK
    if (depth === 'comprehensive' || depth === 'deep') {
      try {
        totalAttempts++;
        const techQuery = `${cleanCompanyName} technology stack tools uses built with integrations API`;
        const techResults = await performWebSearch(techQuery);
        
        if (techResults && techResults.length > 0) {
          const techText = techResults.map(r => r.snippet).join(' ').toLowerCase();
          
          // Common technologies to detect
          const technologies = {
            languages: ['javascript', 'python', 'java', 'ruby', 'php', 'golang', 'rust', 'swift', 'kotlin'],
            frameworks: ['react', 'angular', 'vue', 'django', 'rails', 'spring', 'express', 'flask'],
            databases: ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'cassandra'],
            cloud: ['aws', 'azure', 'gcp', 'google cloud', 'heroku', 'digitalocean'],
            tools: ['docker', 'kubernetes', 'jenkins', 'github', 'gitlab', 'jira', 'slack']
          };
          
          for (const [category, techs] of Object.entries(technologies)) {
            for (const tech of techs) {
              if (techText.includes(tech)) {
                companyData.technology.stack.push(tech);
                dataPoints++;
                if (companyData.technology.stack.length >= 10) break;
              }
            }
          }
          
          // Detect cloud provider
          if (techText.includes('aws') || techText.includes('amazon web services')) {
            companyData.technology.platforms.push('AWS');
            dataPoints++;
          }
          if (techText.includes('azure') || techText.includes('microsoft azure')) {
            companyData.technology.platforms.push('Azure');
            dataPoints++;
          }
          if (techText.includes('google cloud') || techText.includes('gcp')) {
            companyData.technology.platforms.push('Google Cloud');
            dataPoints++;
          }
          
          companyData.metadata.sources.push('Web Search - Technology');
        }
      } catch (error) {
        logger.warn(`Technology search failed for ${cleanCompanyName}:`, error.message);
      }
    }

    // 5. RECENT NEWS & SIGNALS
    try {
      totalAttempts++;
      const newsQuery = `${cleanCompanyName} news announcement 2024 2025 latest`;
      const newsResults = await performWebSearch(newsQuery);
      
      if (newsResults && newsResults.length > 0) {
        // Take top 3 news items
        companyData.news.recent = newsResults.slice(0, 3).map(item => ({
          title: item.title,
          summary: item.snippet,
          url: item.url,
          date: new Date().toISOString() // Would need to extract actual date
        }));
        
        dataPoints += companyData.news.recent.length;
        
        // Analyze news sentiment and signals
        const newsText = newsResults.map(r => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
        
        // Growth signals
        if (newsText.includes('expansion') || newsText.includes('new office') || newsText.includes('opening')) {
          companyData.signals.growth.expansion = true;
          dataPoints++;
        }
        if (newsText.includes('partnership') || newsText.includes('collaboration')) {
          companyData.signals.growth.partnerships.push('Recent partnership activity');
          dataPoints++;
        }
        if (newsText.includes('launch') || newsText.includes('new product') || newsText.includes('release')) {
          companyData.signals.growth.newProducts = true;
          companyData.signals.opportunity.productLaunch = true;
          dataPoints++;
        }
        
        // Risk signals
        if (newsText.includes('layoff') || newsText.includes('restructuring') || newsText.includes('downsizing')) {
          companyData.signals.risk.layoffs = true;
          dataPoints++;
        }
        if (newsText.includes('lawsuit') || newsText.includes('legal') || newsText.includes('sued')) {
          companyData.signals.risk.lawsuits = true;
          dataPoints++;
        }
        
        // Determine sentiment
        const positiveWords = ['growth', 'success', 'expansion', 'achievement', 'award', 'record'];
        const negativeWords = ['layoff', 'loss', 'decline', 'lawsuit', 'problem', 'issue'];
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        positiveWords.forEach(word => {
          if (newsText.includes(word)) positiveCount++;
        });
        
        negativeWords.forEach(word => {
          if (newsText.includes(word)) negativeCount++;
        });
        
        if (positiveCount > negativeCount) {
          companyData.news.sentiment = 'positive';
        } else if (negativeCount > positiveCount) {
          companyData.news.sentiment = 'negative';
        } else {
          companyData.news.sentiment = 'neutral';
        }
        
        companyData.metadata.sources.push('Web Search - News & Signals');
      }
    } catch (error) {
      logger.warn(`News search failed for ${cleanCompanyName}:`, error.message);
    }

    // 6. CALCULATE ASSESSMENT SCORES
    const assessCompany = () => {
      let score = 50; // Base score
      
      // Size scoring
      if (companyData.metrics.employees.count) {
        if (companyData.metrics.employees.count >= 50 && companyData.metrics.employees.count <= 1000) {
          score += 10; // Sweet spot for B2B sales
        } else if (companyData.metrics.employees.count > 1000) {
          score += 5; // Enterprise but longer sales cycle
        }
      }
      
      // Financial health
      if (companyData.metrics.funding.total) {
        if (companyData.metrics.funding.total >= 10) score += 10;
        if (companyData.metrics.funding.total >= 50) score += 5;
      }
      
      if (companyData.metrics.revenue.amount) {
        if (companyData.metrics.revenue.amount >= 10) score += 10;
        if (companyData.metrics.revenue.amount >= 50) score += 5;
      }
      
      // Growth signals
      if (companyData.signals.growth.hiring) score += 5;
      if (companyData.signals.growth.expansion) score += 5;
      if (companyData.signals.growth.newProducts) score += 3;
      if (companyData.signals.opportunity.recentFunding) score += 8;
      
      // Risk factors
      if (companyData.signals.risk.layoffs) score -= 10;
      if (companyData.signals.risk.lawsuits) score -= 5;
      
      // News sentiment
      if (companyData.news.sentiment === 'positive') score += 5;
      if (companyData.news.sentiment === 'negative') score -= 5;
      
      // Cap score at 100
      score = Math.min(100, Math.max(0, score));
      
      companyData.assessment.score = score;
      
      // Determine tier
      if (score >= 85) {
        companyData.assessment.tier = 'Tier 1 - Hot Prospect';
        companyData.assessment.recommendedApproach = 'Immediate outreach with executive sponsorship';
        companyData.assessment.salesCycleEstimate = '30-60 days';
      } else if (score >= 70) {
        companyData.assessment.tier = 'Tier 2 - Qualified Lead';
        companyData.assessment.recommendedApproach = 'Standard sales process with personalized approach';
        companyData.assessment.salesCycleEstimate = '60-90 days';
      } else if (score >= 55) {
        companyData.assessment.tier = 'Tier 3 - Nurture';
        companyData.assessment.recommendedApproach = 'Add to nurture campaign, monitor for signals';
        companyData.assessment.salesCycleEstimate = '90-180 days';
      } else {
        companyData.assessment.tier = 'Tier 4 - Monitor';
        companyData.assessment.recommendedApproach = 'Low priority, automated touchpoints only';
        companyData.assessment.salesCycleEstimate = '180+ days';
      }
      
      // Estimate deal size based on company metrics
      if (companyData.metrics.employees.count) {
        const employees = companyData.metrics.employees.count;
        if (employees < 50) {
          companyData.assessment.estimatedDealSize = '$10K - $30K';
        } else if (employees < 200) {
          companyData.assessment.estimatedDealSize = '$30K - $100K';
        } else if (employees < 1000) {
          companyData.assessment.estimatedDealSize = '$100K - $500K';
        } else {
          companyData.assessment.estimatedDealSize = '$500K+';
        }
      }
      
      // Identify strengths
      if (companyData.metrics.funding.total >= 10) {
        companyData.assessment.strengths.push('Well-funded');
      }
      if (companyData.signals.growth.hiring) {
        companyData.assessment.strengths.push('Actively growing');
      }
      if (companyData.metrics.revenue.amount >= 10) {
        companyData.assessment.strengths.push('Established revenue');
      }
      if (companyData.signals.opportunity.recentFunding) {
        companyData.assessment.strengths.push('Recent funding (budget available)');
      }
      
      // Identify weaknesses
      if (companyData.signals.risk.layoffs) {
        companyData.assessment.weaknesses.push('Recent layoffs (budget concerns)');
      }
      if (!companyData.metrics.funding.total && !companyData.metrics.revenue.amount) {
        companyData.assessment.weaknesses.push('Limited financial information');
      }
      if (companyData.metrics.employees.count && companyData.metrics.employees.count < 10) {
        companyData.assessment.weaknesses.push('Very early stage');
      }
    };
    
    assessCompany();

    // Calculate data quality and confidence
    const successRate = totalAttempts > 0 ? (dataPoints / (totalAttempts * 5)) : 0; // Assume 5 data points per search
    companyData.metadata.dataQuality = Math.round(successRate * 100);
    companyData.metadata.confidence = Math.min(100, Math.round((dataPoints / 30) * 100)); // Assume 30 total possible data points

    // Cache the results
    cache.set(cacheKey, {
      data: companyData,
      timestamp: Date.now()
    });

    logger.info(`Company research complete for ${cleanCompanyName}: ${dataPoints} data points collected`);

    // Return results
    res.json({
      success: true,
      data: companyData,
      metrics: {
        dataPointsCollected: dataPoints,
        searchesPerformed: totalAttempts,
        confidence: companyData.metadata.confidence,
        dataQuality: companyData.metadata.dataQuality
      }
    });

  } catch (error) {
    logger.error('Company research error:', error);
    next(error);
  }
};

/**
 * Perform web search using DuckDuckGo HTML interface
 */
async function performWebSearch(query) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result').each((index, element) => {
      if (index >= 10) return; // Limit to 10 results

      const $result = $(element);
      const title = $result.find('.result__title').text().trim();
      const url = $result.find('.result__url').text().trim();
      const snippet = $result.find('.result__snippet').text().trim();

      if (title && snippet) {
        results.push({
          title: title.substring(0, 200),
          url: url || '',
          snippet: snippet.substring(0, 300)
        });
      }
    });

    return results;
  } catch (error) {
    logger.error('Web search error:', error.message);
    return [];
  }
}

/**
 * Get list of researched companies from cache
 */
export const getResearchedCompanies = async (req, res, next) => {
  try {
    const companies = [];
    
    for (const [key, value] of cache.entries()) {
      if (key.startsWith('company:')) {
        const companyName = key.split(':')[1];
        companies.push({
          name: value.data.company.name,
          tier: value.data.assessment.tier,
          score: value.data.assessment.score,
          cachedAt: new Date(value.timestamp).toISOString(),
          cacheAge: Date.now() - value.timestamp
        });
      }
    }

    res.json({
      success: true,
      companies,
      cacheInfo: {
        totalCached: companies.length,
        ttl: CACHE_TTL
      }
    });
  } catch (error) {
    logger.error('Error getting researched companies:', error);
    next(error);
  }
};

/**
 * Clear company research cache
 */
export const clearResearchCache = async (req, res, next) => {
  try {
    const { companyName } = req.body;
    
    if (companyName) {
      // Clear specific company
      const keysToDelete = [];
      for (const key of cache.keys()) {
        if (key.includes(companyName.toLowerCase())) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => cache.delete(key));
      
      res.json({
        success: true,
        message: `Cache cleared for ${companyName}`,
        keysCleared: keysToDelete.length
      });
    } else {
      // Clear all cache
      const size = cache.size;
      cache.clear();
      
      res.json({
        success: true,
        message: 'All cache cleared',
        keysCleared: size
      });
    }
  } catch (error) {
    logger.error('Error clearing cache:', error);
    next(error);
  }
};

export default {
  researchCompany,
  getResearchedCompanies,
  clearResearchCache
};