/**
 * Company Research API Endpoint
 * Gathers REAL company data from multiple sources
 * Returns structured business intelligence data
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface CompanyResearchRequest {
  companyName: string;
  includeLinkedIn?: boolean;
  includeNews?: boolean;
  includeFinancials?: boolean;
}

interface CompanyData {
  basicInfo: {
    name: string;
    website?: string;
    description?: string;
    industry?: string;
    founded?: string;
    headquarters?: string;
  };
  metrics: {
    employeeCount?: string;
    employeeRange?: string;
    revenue?: string;
    revenueRange?: string;
    funding?: string;
    lastFundingRound?: string;
  };
  market: {
    targetMarket?: string;
    competitors?: string[];
    marketPosition?: string;
    growthStage?: string;
  };
  technology: {
    techStack?: string[];
    productType?: string;
    cloudProvider?: string;
    integrations?: string[];
  };
  signals: {
    recentNews?: Array<{
      title: string;
      date?: string;
      summary?: string;
      url?: string;
    }>;
    jobPostings?: number;
    expansionSignals?: string[];
    painPoints?: string[];
  };
  sources: string[];
  confidence: number;
  researchTimestamp: number;
}

export async function POST(request: NextRequest) {
  console.log('🏢 Company Research API called');
  
  try {
    const body: CompanyResearchRequest = await request.json();
    const { companyName, includeLinkedIn = true, includeNews = true, includeFinancials = true } = body;
    
    if (!companyName || companyName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Valid company name is required (at least 2 characters)' },
        { status: 400 }
      );
    }

    console.log(`🔍 Starting comprehensive research for: "${companyName}"`);
    
    const companyData: CompanyData = {
      basicInfo: { name: companyName },
      metrics: {},
      market: {},
      technology: {},
      signals: {},
      sources: [],
      confidence: 0,
      researchTimestamp: Date.now()
    };

    // Track successful data points for confidence scoring
    let dataPoints = 0;
    let successfulQueries = 0;

    // 1. Search for company overview and basic info
    try {
      const overviewQuery = `${companyName} company overview headquarters industry`;
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(overviewQuery)}`;
      
      console.log(`📊 Searching for company overview...`);
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      const results: string[] = [];
      
      $('.result__snippet').each((i, elem) => {
        if (i < 5) {
          results.push($(elem).text());
        }
      });
      
      // Extract company information from search results
      const combinedText = results.join(' ').toLowerCase();
      
      // Industry detection
      const industries = ['software', 'saas', 'fintech', 'healthcare', 'retail', 'manufacturing', 'consulting', 'technology', 'biotech', 'edtech', 'marketing', 'logistics', 'real estate', 'insurance', 'banking'];
      for (const industry of industries) {
        if (combinedText.includes(industry)) {
          companyData.basicInfo.industry = industry.charAt(0).toUpperCase() + industry.slice(1);
          dataPoints++;
          break;
        }
      }
      
      // Headquarters detection (look for city names)
      const cities = ['san francisco', 'new york', 'boston', 'seattle', 'austin', 'chicago', 'los angeles', 'denver', 'london', 'paris', 'berlin', 'toronto', 'singapore', 'tokyo'];
      for (const city of cities) {
        if (combinedText.includes(city)) {
          companyData.basicInfo.headquarters = city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          dataPoints++;
          break;
        }
      }
      
      // Founded year detection
      const yearMatch = combinedText.match(/founded.{0,10}(19\d{2}|20\d{2})/i);
      if (yearMatch) {
        companyData.basicInfo.founded = yearMatch[1];
        dataPoints++;
      }
      
      companyData.sources.push('DuckDuckGo Search');
      successfulQueries++;
      
    } catch (error) {
      console.warn('Could not fetch company overview:', error);
    }

    // 2. Search for employee count and company size
    try {
      const sizeQuery = `${companyName} employees team size number of employees`;
      const sizeUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(sizeQuery)}`;
      
      console.log(`👥 Searching for company size...`);
      const response = await axios.get(sizeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 8000
      });
      
      const $ = cheerio.load(response.data);
      const sizeText = $('.result__snippet').text();
      
      // Look for employee count patterns
      const employeePatterns = [
        /(\d{1,3}[,.]?\d{0,3})\+?\s*employees/i,
        /team of\s*(\d{1,3}[,.]?\d{0,3})/i,
        /(\d{1,3}[,.]?\d{0,3})\s*people/i,
        /staff of\s*(\d{1,3}[,.]?\d{0,3})/i
      ];
      
      for (const pattern of employeePatterns) {
        const match = sizeText.match(pattern);
        if (match) {
          companyData.metrics.employeeCount = match[1].replace(/[,.]/, '');
          dataPoints++;
          
          // Determine employee range
          const count = parseInt(companyData.metrics.employeeCount);
          if (count < 10) companyData.metrics.employeeRange = '1-10 (Startup)';
          else if (count < 50) companyData.metrics.employeeRange = '11-50 (Small)';
          else if (count < 200) companyData.metrics.employeeRange = '51-200 (Mid-Market)';
          else if (count < 1000) companyData.metrics.employeeRange = '201-1000 (Large)';
          else companyData.metrics.employeeRange = '1000+ (Enterprise)';
          
          break;
        }
      }
      
      successfulQueries++;
      
    } catch (error) {
      console.warn('Could not fetch company size:', error);
    }

    // 3. Search for revenue and funding information
    if (includeFinancials) {
      try {
        const fundingQuery = `${companyName} funding revenue valuation series investment`;
        const fundingUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(fundingQuery)}`;
        
        console.log(`💰 Searching for financial information...`);
        const response = await axios.get(fundingUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
          },
          timeout: 8000
        });
        
        const $ = cheerio.load(response.data);
        const fundingText = $('.result__snippet').text();
        
        // Look for funding patterns
        const fundingPatterns = [
          /raised\s*\$?([\d.]+)\s*(million|billion|M|B)/i,
          /funding.*\$?([\d.]+)\s*(million|billion|M|B)/i,
          /series\s*([A-E])\s*.*\$?([\d.]+)\s*(million|billion|M|B)/i
        ];
        
        for (const pattern of fundingPatterns) {
          const match = fundingText.match(pattern);
          if (match) {
            const amount = parseFloat(match[1]);
            const unit = match[2] || match[3];
            const multiplier = unit.toLowerCase().startsWith('b') ? 1000 : 1;
            companyData.metrics.funding = `$${amount * multiplier}M`;
            dataPoints++;
            
            // Extract series if available
            if (match[1] && match[1].match(/[A-E]/)) {
              companyData.metrics.lastFundingRound = `Series ${match[1]}`;
              dataPoints++;
            }
            break;
          }
        }
        
        // Look for revenue patterns
        const revenuePatterns = [
          /revenue.*\$?([\d.]+)\s*(million|billion|M|B)/i,
          /\$?([\d.]+)\s*(million|billion|M|B).*revenue/i,
          /annual.*\$?([\d.]+)\s*(million|billion|M|B)/i
        ];
        
        for (const pattern of revenuePatterns) {
          const match = fundingText.match(pattern);
          if (match) {
            const amount = parseFloat(match[1]);
            const unit = match[2];
            const multiplier = unit.toLowerCase().startsWith('b') ? 1000 : 1;
            companyData.metrics.revenue = `$${amount * multiplier}M`;
            
            // Determine revenue range
            const revAmount = amount * multiplier;
            if (revAmount < 1) companyData.metrics.revenueRange = '<$1M (Early Stage)';
            else if (revAmount < 10) companyData.metrics.revenueRange = '$1M-$10M (Growth)';
            else if (revAmount < 50) companyData.metrics.revenueRange = '$10M-$50M (Scale)';
            else if (revAmount < 100) companyData.metrics.revenueRange = '$50M-$100M (Expansion)';
            else companyData.metrics.revenueRange = '$100M+ (Enterprise)';
            
            dataPoints++;
            break;
          }
        }
        
        companyData.sources.push('Financial Search');
        successfulQueries++;
        
      } catch (error) {
        console.warn('Could not fetch financial information:', error);
      }
    }

    // 4. Search for technology stack and product information
    try {
      const techQuery = `${companyName} technology stack software uses integrations API`;
      const techUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(techQuery)}`;
      
      console.log(`🔧 Searching for technology information...`);
      const response = await axios.get(techUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 8000
      });
      
      const $ = cheerio.load(response.data);
      const techText = $('.result__snippet').text().toLowerCase();
      
      // Detect technologies
      const technologies = ['react', 'angular', 'vue', 'node.js', 'python', 'java', 'golang', '.net', 'ruby', 'php', 'kubernetes', 'docker', 'aws', 'azure', 'gcp', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch'];
      const detectedTech: string[] = [];
      
      for (const tech of technologies) {
        if (techText.includes(tech)) {
          detectedTech.push(tech);
          if (detectedTech.length >= 5) break; // Limit to 5 technologies
        }
      }
      
      if (detectedTech.length > 0) {
        companyData.technology.techStack = detectedTech;
        dataPoints += detectedTech.length;
      }
      
      // Detect cloud provider
      if (techText.includes('aws') || techText.includes('amazon web services')) {
        companyData.technology.cloudProvider = 'AWS';
        dataPoints++;
      } else if (techText.includes('azure') || techText.includes('microsoft azure')) {
        companyData.technology.cloudProvider = 'Azure';
        dataPoints++;
      } else if (techText.includes('gcp') || techText.includes('google cloud')) {
        companyData.technology.cloudProvider = 'Google Cloud';
        dataPoints++;
      }
      
      // Detect product type
      if (techText.includes('saas') || techText.includes('software as a service')) {
        companyData.technology.productType = 'SaaS';
        dataPoints++;
      } else if (techText.includes('platform')) {
        companyData.technology.productType = 'Platform';
        dataPoints++;
      } else if (techText.includes('api')) {
        companyData.technology.productType = 'API/Integration';
        dataPoints++;
      }
      
      successfulQueries++;
      
    } catch (error) {
      console.warn('Could not fetch technology information:', error);
    }

    // 5. Search for recent news and market signals
    if (includeNews) {
      try {
        const newsQuery = `${companyName} latest news announcement partnership expansion 2024 2025`;
        const newsUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(newsQuery)}`;
        
        console.log(`📰 Searching for recent news...`);
        const response = await axios.get(newsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 8000
        });
        
        const $ = cheerio.load(response.data);
        const newsItems: Array<{ title: string; summary?: string }> = [];
        
        $('.result').each((i, elem) => {
          if (i < 3) {
            const title = $(elem).find('.result__title').text().trim();
            const snippet = $(elem).find('.result__snippet').text().trim();
            if (title && snippet) {
              newsItems.push({
                title: title.substring(0, 100),
                summary: snippet.substring(0, 200)
              });
            }
          }
        });
        
        if (newsItems.length > 0) {
          companyData.signals.recentNews = newsItems;
          dataPoints += newsItems.length;
        }
        
        // Look for expansion signals in news text
        const expansionKeywords = ['expansion', 'new office', 'hiring', 'growth', 'partnership', 'acquisition', 'launching', 'new product'];
        const detectedSignals: string[] = [];
        const newsText = $('.result__snippet').text().toLowerCase();
        
        for (const keyword of expansionKeywords) {
          if (newsText.includes(keyword)) {
            detectedSignals.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
            if (detectedSignals.length >= 3) break;
          }
        }
        
        if (detectedSignals.length > 0) {
          companyData.signals.expansionSignals = detectedSignals;
          dataPoints += detectedSignals.length;
        }
        
        companyData.sources.push('News Search');
        successfulQueries++;
        
      } catch (error) {
        console.warn('Could not fetch recent news:', error);
      }
    }

    // 6. Determine growth stage based on collected data
    if (companyData.metrics.employeeCount || companyData.metrics.funding || companyData.metrics.revenue) {
      const employees = parseInt(companyData.metrics.employeeCount || '0');
      const fundingMatch = companyData.metrics.funding?.match(/\$?([\d.]+)M/);
      const funding = fundingMatch ? parseFloat(fundingMatch[1]) : 0;
      
      if (employees < 10 || funding < 1) {
        companyData.market.growthStage = 'Seed/Early Stage';
      } else if (employees < 50 || funding < 10) {
        companyData.market.growthStage = 'Series A/Growth';
      } else if (employees < 200 || funding < 50) {
        companyData.market.growthStage = 'Series B/Scaling';
      } else if (employees < 1000 || funding < 100) {
        companyData.market.growthStage = 'Series C+/Expansion';
      } else {
        companyData.market.growthStage = 'Late Stage/Enterprise';
      }
      dataPoints++;
    }

    // Calculate confidence score based on data completeness
    const totalPossibleDataPoints = 25; // Approximate maximum data points
    companyData.confidence = Math.min(100, Math.round((dataPoints / totalPossibleDataPoints) * 100));

    // Add description if we have enough context
    if (companyData.basicInfo.industry || companyData.technology.productType) {
      companyData.basicInfo.description = `${companyName} is a ${companyData.basicInfo.industry || 'technology'} company${companyData.technology.productType ? ` offering ${companyData.technology.productType} solutions` : ''}${companyData.basicInfo.headquarters ? ` based in ${companyData.basicInfo.headquarters}` : ''}.`;
    }

    console.log(`✅ Company research complete: ${dataPoints} data points collected, ${companyData.confidence}% confidence`);
    
    return NextResponse.json({
      success: true,
      company: companyData,
      metadata: {
        dataPoints,
        successfulQueries,
        totalQueries: 5,
        researchDuration: Date.now() - companyData.researchTimestamp,
        confidence: companyData.confidence
      }
    });
    
  } catch (error: any) {
    console.error('❌ Company research API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Company research failed',
        message: error.message,
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    status: 'Company Research API is running',
    endpoint: '/api/company-research',
    method: 'POST',
    accepts: {
      companyName: 'string (required)',
      includeLinkedIn: 'boolean (optional, default: true)',
      includeNews: 'boolean (optional, default: true)',
      includeFinancials: 'boolean (optional, default: true)'
    },
    returns: {
      basicInfo: 'Company name, industry, headquarters, etc.',
      metrics: 'Employee count, revenue, funding',
      market: 'Growth stage, market position',
      technology: 'Tech stack, product type, integrations',
      signals: 'Recent news, expansion signals',
      confidence: 'Data quality score (0-100)'
    },
    realData: true,
    sources: ['DuckDuckGo', 'Public web data', 'News searches']
  });
}