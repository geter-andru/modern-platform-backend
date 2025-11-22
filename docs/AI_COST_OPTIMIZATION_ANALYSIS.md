# AI Cost Optimization Analysis
## H&S Platform - Claude API Usage

**Analysis Date:** 2025-11-20
**Analyst Role:** AI & Infrastructure Cost Controller

---

## Executive Summary

Analysis of 6 AI services using Anthropic Claude API to identify cost optimization opportunities.

### Current Model Distribution:
- **Claude 3 Opus** (Most Expensive): 1 service
- **Claude 3.5 Sonnet** (Mid-tier): 3 services  
- **Claude 3.5 Haiku** (Most Economical): 2 services

### Pricing Reference (per 1M tokens):
| Model | Input Cost | Output Cost | Total Cost (50/50 split) |
|-------|-----------|-------------|--------------------------|
| Claude 3 Opus | $15 | $75 | $45/1M tokens |
| Claude 3.5 Sonnet | $3 | $15 | $9/1M tokens |
| Claude 3.5 Haiku | $0.25 | $1.25 | $0.75/1M tokens |

**Cost Ratio:** Opus is **60x more expensive** than Haiku, **5x more expensive** than Sonnet

---

## Service-by-Service Analysis


### 1. 🔴 **aiRatingController.js** - HIGHEST COST RISK

**Current Model:** Claude 3 Opus (`claude-3-opus-20240229`)
**Operation:** Company ICP fit rating (0-100 score)
**Max Tokens:** 2,048
**Temperature:** 0.5 (low - deterministic scoring)

**Estimated Cost per Request:**
- Input: ~1,500 tokens (ICP framework + company data) = $0.0225
- Output: ~800 tokens (JSON rating response) = $0.0600
- **Total: ~$0.0825 per rating**

**Usage Pattern:** Triggered when users rate companies against their ICP
**Volume Risk:** HIGH - Could be called frequently in batch operations

**🎯 OPTIMIZATION OPPORTUNITY:**
```
RECOMMENDATION: Downgrade to Claude 3.5 Sonnet
REASONING: 
- Task requires JSON generation with structured scoring
- Low temperature (0.5) means consistency, not creativity
- Sonnet handles JSON output extremely well
- Rating quality unlikely to degrade

SAVINGS: 82% cost reduction
- Current: $0.0825/request
- Optimized: $0.0149/request (Sonnet)
- Potential: $0.0127/request (Haiku - if quality acceptable)

ACTION: Test Sonnet on sample companies, compare rating quality
PRIORITY: 🔥 CRITICAL - Highest cost service
```

---

### 2. 🟡 **ratingWorker.js** - BATCH PROCESSING RISK

**Current Model:** Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
**Operation:** Background company rating (same as #1, but async)
**Max Tokens:** 2,048
**Temperature:** 0.5

**Estimated Cost per Request:**
- Input: ~1,500 tokens = $0.0045
- Output: ~800 tokens = $0.0120
- **Total: ~$0.0165 per rating**

**Usage Pattern:** Batch rating jobs (multiple companies at once)
**Volume Risk:** HIGH - Background workers process in batches

**🎯 OPTIMIZATION OPPORTUNITY:**
```
RECOMMENDATION: Downgrade to Claude 3.5 Haiku
REASONING:
- Background jobs can tolerate slightly longer processing
- Same task as aiRatingController (should use same model)
- Batch operations amplify cost savings
- If 100 companies rated: $16.50 (Sonnet) vs $1.27 (Haiku)

SAVINGS: 92% cost reduction
- Current: $0.0165/request
- Optimized: $0.00127/request (Haiku)

ACTION: Test Haiku on 10 sample ratings, validate quality
PRIORITY: 🔥 HIGH - Batch operations multiply costs
```

---

### 3. 🟢 **personaWorker.js** - WELL OPTIMIZED

**Current Model:** Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
**Operation:** Generate 3-5 buyer personas
**Max Tokens:** 4,096
**Temperature:** 0.7 (moderate creativity)

**Estimated Cost per Request:**
- Input: ~1,200 tokens (company context + prompt) = $0.0036
- Output: ~3,000 tokens (3-5 detailed personas) = $0.0450
- **Total: ~$0.0486 per generation**

**Usage Pattern:** One-time per user/company setup
**Volume Risk:** LOW - Typically run once during onboarding

**🎯 OPTIMIZATION OPPORTUNITY:**
```
RECOMMENDATION: Keep Sonnet, but optimize prompt
REASONING:
- Requires creative, nuanced persona generation
- Higher temperature (0.7) benefits from Sonnet quality
- Low frequency usage (not cost driver)
- Haiku may produce generic/shallow personas

SAVINGS: 15% via prompt optimization
- Current: $0.0486/request
- Optimized: $0.0413/request (reduce output verbosity)

ACTION: Review prompt - remove unnecessary instructions
PRIORITY: 🟡 MEDIUM - Good model choice, tune prompt
```

---

### 4. 🟢 **aiPersonaController.js** - ACCEPTABLE

**Current Model:** Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
**Operation:** Authenticated persona generation (same as #3)
**Max Tokens:** 4,096
**Temperature:** 0.7

**Estimated Cost:** ~$0.0486 per request (same as personaWorker)
**Usage Pattern:** Interactive API endpoint (user-triggered)
**Volume Risk:** LOW - Premium feature, gated by auth

**🎯 OPTIMIZATION OPPORTUNITY:**
```
RECOMMENDATION: No change needed
REASONING:
- Same as personaWorker (should use same model)
- User-facing endpoint requires quality
- Low volume due to authentication gate

SAVINGS: None recommended
ACTION: Monitor usage frequency via dashboard
PRIORITY: 🟢 LOW - Well optimized for use case
```

---

### 5. 🟢 **demoICPService.js** - EXCELLENT OPTIMIZATION

**Current Model:** Claude 3.5 Haiku (`claude-3-5-haiku-20241022`)
**Operation:** Public demo ICP generation (2 personas)
**Max Tokens:** 3,000
**Temperature:** 0.8 (high creativity)

**Estimated Cost per Request:**
- Input: ~1,500 tokens (demo prompt) = $0.000375
- Output: ~2,000 tokens (2 personas) = $0.0025
- **Total: ~$0.002875 per demo**

**Usage Pattern:** Public endpoint (no auth required)
**Volume Risk:** HIGH - Could be abused/spammed

**🎯 OPTIMIZATION OPPORTUNITY:**
```
RECOMMENDATION: Perfect as-is, add rate limiting
REASONING:
- Haiku is cheapest model (already optimal)
- Public endpoint needs cost protection
- Quality is good enough for demos
- Risk is volume, not unit cost

SAVINGS: Add protective measures
- Implement IP-based rate limiting (5 demos/hour)
- Add CAPTCHA for repeated requests
- Consider caching popular demo results

ACTION: Add rate limiting middleware
PRIORITY: 🔥 CRITICAL - Prevent abuse/spam
```

---

### 6. 🟡 **prospectDiscoveryService.js** - GOOD, NEEDS MONITORING

**Current Model:** Claude 3.5 Haiku (`claude-3-5-haiku-20241022`)
**Operation:** Discover prospect companies with web search
**Max Tokens:** 4,000
**Temperature:** 0.6
**Special:** Uses web search tool (additional cost)

**Estimated Cost per Request:**
- Input: ~2,000 tokens (ICP context) = $0.0005
- Output: ~3,500 tokens (prospect list) = $0.004375
- Web search: Variable (10 searches max)
- **Total: ~$0.004875 + web search costs**

**Usage Pattern:** User-triggered discovery
**Volume Risk:** MEDIUM - Web search adds variable cost

**🎯 OPTIMIZATION OPPORTUNITY:**
```
RECOMMENDATION: Monitor web search usage
REASONING:
- Haiku is already optimal choice
- Web search tool adds hidden costs (not tracked yet)
- Need to measure total cost including search

SAVINGS: Track and optimize web search usage
- Reduce max_searches from 10 to 5 if quality acceptable
- Cache search results for common queries
- Consider switching to Exa API for cheaper search

ACTION: Add web search cost tracking
PRIORITY: 🟡 MEDIUM - Need visibility into total cost
```

---


## Cost Projection Analysis

### Scenario: 1,000 Monthly Active Users

**Assumptions:**
- Each user rates 20 companies/month
- Each user generates personas once
- Demo endpoint: 500 public demos/month (no auth)
- Prospect discovery: 2x per user/month

**Current Monthly Cost:**

| Service | Volume | Cost/Request | Monthly Cost |
|---------|--------|--------------|--------------|
| aiRatingController (Opus) | 20,000 | $0.0825 | **$1,650** |
| ratingWorker (Sonnet) | 10,000 | $0.0165 | $165 |
| personaWorker (Sonnet) | 1,000 | $0.0486 | $48.60 |
| aiPersonaController (Sonnet) | 1,000 | $0.0486 | $48.60 |
| demoICPService (Haiku) | 500 | $0.002875 | $1.44 |
| prospectDiscovery (Haiku) | 2,000 | $0.004875 | $9.75 |
| **TOTAL** | | | **$1,923.39/month** |

**Cost Breakdown:**
- 🔴 **86% of costs** come from aiRatingController alone
- 🟡 **9%** from ratingWorker
- 🟢 **5%** from persona generation (both controllers)
- 🟢 **<1%** from demos and discovery

---

### Optimized Monthly Cost (After Recommendations)

| Service | Change | Volume | Cost/Request | Monthly Cost | Savings |
|---------|--------|--------|--------------|--------------|---------|
| aiRatingController | Opus → Sonnet | 20,000 | $0.0149 | **$298** | $1,352 (82%) |
| ratingWorker | Sonnet → Haiku | 10,000 | $0.00127 | $12.70 | $152.30 (92%) |
| personaWorker | Prompt optimization | 1,000 | $0.0413 | $41.30 | $7.30 (15%) |
| aiPersonaController | No change | 1,000 | $0.0486 | $48.60 | $0 |
| demoICPService | Add rate limiting | 500 | $0.002875 | $1.44 | $0 |
| prospectDiscovery | Monitor web search | 2,000 | $0.004875 | $9.75 | $0 |
| **TOTAL** | | | | **$411.79/month** | **$1,511.60/month** |

**💰 Total Savings: 78.6% cost reduction ($1,511.60/month or $18,139.20/year)**

---

## Strategic Recommendations

### Priority 1: 🔥 CRITICAL (Immediate Action Required)

#### 1A. Downgrade aiRatingController from Opus to Sonnet
```javascript
// File: src/controllers/aiRatingController.js
// Line: ~261

// BEFORE:
model: 'claude-3-opus-20240229',

// AFTER:
model: 'claude-3-5-sonnet-20241022',

// Update recordAIMetric call at line ~278 as well
```

**Testing Protocol:**
1. Test on 10 diverse companies (different sizes, industries)
2. Compare rating scores between Opus and Sonnet
3. If variance < 5 points, approve Sonnet
4. Monitor for 1 week, rollback if quality degrades

**Expected Impact:** $1,352/month savings (70% of total optimization)

---

#### 1B. Add Rate Limiting to Demo Endpoint

**Create middleware:**
```javascript
// File: src/middleware/demoRateLimiter.js

import rateLimit from 'express-rate-limit';

export const demoRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour per IP
  message: 'Too many demo requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis store in production for distributed rate limiting
});
```

**Apply to route:**
```javascript
// File: src/routes/demo.js (or wherever demo endpoint is)

import { demoRateLimiter } from '../middleware/demoRateLimiter.js';

router.post('/api/demo/generate-icp', demoRateLimiter, demoController.generateICP);
```

**Expected Impact:** Prevent cost spikes from abuse/spam

---

### Priority 2: 🟡 HIGH (Implement Within 2 Weeks)

#### 2A. Downgrade ratingWorker from Sonnet to Haiku

**Testing Protocol:**
1. Test on 20 companies (batch scenario)
2. Compare quality vs current Sonnet output
3. Measure processing time difference
4. If quality acceptable, deploy

**Implementation:**
```javascript
// File: src/workers/ratingWorker.js
// Line: ~184

// BEFORE:
model: 'claude-3-5-sonnet-20241022',

// AFTER:
model: 'claude-3-5-haiku-20241022',
```

**Expected Impact:** $152/month savings

---

#### 2B. Optimize Persona Generation Prompts

**Current Prompt Analysis:**
- personaWorker.js prompt: ~1,200 tokens input
- aiPersonaController.js prompt: Same as above

**Optimization Targets:**
1. Remove redundant instructions (lines 100-127 in both files)
2. Simplify output format requirements
3. Reduce example verbosity

**Before (verbose):**
```
For each persona, provide:

1. TITLE/ROLE
   - Specific job title (e.g., "VP of Sales Operations", "Director of IT Infrastructure")
   - Level in organization (C-Suite, VP, Director, Manager, Individual Contributor)

2. DEMOGRAPHICS
   - Company size (employee count range)
   - Company revenue range
   ...etc (30+ lines of instructions)
```

**After (concise):**
```
Generate 3-5 buyer personas with: title, level, demographics (company size, revenue, vertical, region, experience), psychographics (goals, challenges, motivations, fears, values), and buying behavior (criteria, budget authority, role, sources, channels).
```

**Expected Impact:** 
- Reduce input tokens by ~300 tokens
- 15% cost reduction on persona generation
- $7.30/month savings (small, but adds up)

---

### Priority 3: 🟢 MEDIUM (Nice-to-Have, Implement When Capacity Allows)

#### 3A. Add Web Search Cost Tracking

**Current Gap:** prospectDiscoveryService uses web search tool, but we don't track those costs separately.

**Solution:**
```javascript
// In prospectDiscoveryService.js, after API call:

recordAIMetric({
  operation: 'prospectDiscovery',
  duration,
  success: true,
  customerId: userId,
  resultsCount: prospects.prospects.length,
  inputTokens: aiResponse.usage.inputTokens,
  outputTokens: aiResponse.usage.outputTokens,
  totalTokens: aiResponse.usage.totalTokens,
  estimatedCost: estimatedCost,
  model: 'claude-3-5-haiku-20241022',
  // NEW: Track web search usage
  webSearchCount: aiResponse.webSearchCount || 0,
  webSearchCost: calculateWebSearchCost(aiResponse.webSearchCount)
});
```

**Also update schema:**
```sql
ALTER TABLE ai_usage_metrics 
ADD COLUMN web_search_count INTEGER DEFAULT 0,
ADD COLUMN web_search_cost DECIMAL(10, 6) DEFAULT 0;
```

---

#### 3B. Implement Response Caching

**Use Case:** Demo endpoint and prospect discovery often get similar requests

**Strategy:**
```javascript
// Cache structure:
{
  key: hash(productName + productDescription),
  value: generatedPersonas,
  ttl: 24 hours
}
```

**Implementation:**
- Use Redis for distributed caching
- Hash input parameters as cache key
- Serve cached results for identical requests
- Track cache hit rate in metrics

**Expected Impact:**
- 30-40% cache hit rate for demos
- Reduce API calls by 150-200/month
- $5-10/month savings + faster response times

---


## Implementation Roadmap

### Week 1: Critical Optimizations (Priority 1)

**Day 1-2: Model Testing**
- [ ] Test aiRatingController with Sonnet on 10 sample companies
- [ ] Document quality comparison (Opus vs Sonnet)
- [ ] Get stakeholder approval if variance < 5%

**Day 3-4: Deploy Model Change**
- [ ] Update aiRatingController.js to use Sonnet
- [ ] Update ratingWorker.js model string (if testing passes)
- [ ] Deploy to staging
- [ ] Run integration tests

**Day 5: Rate Limiting**
- [ ] Install express-rate-limit package (`npm install express-rate-limit`)
- [ ] Create demoRateLimiter middleware
- [ ] Apply to demo routes
- [ ] Test with multiple IPs
- [ ] Deploy to production

**Expected Week 1 Impact:** $1,352/month savings + spam protection

---

### Week 2-3: High Priority Optimizations (Priority 2)

**Week 2: Worker Model Downgrade**
- [ ] Test ratingWorker with Haiku on 20 companies
- [ ] Compare batch processing quality
- [ ] Measure latency impact
- [ ] Deploy if acceptable
- [ ] Monitor for 1 week

**Week 3: Prompt Optimization**
- [ ] Review persona generation prompts
- [ ] Create condensed versions
- [ ] A/B test output quality
- [ ] Deploy optimized prompts
- [ ] Monitor token reduction

**Expected Weeks 2-3 Impact:** Additional $159.60/month savings

---

### Month 2: Medium Priority Enhancements (Priority 3)

**Week 1: Web Search Tracking**
- [ ] Update ai_usage_metrics schema
- [ ] Add web search count/cost tracking
- [ ] Deploy schema changes
- [ ] Monitor web search patterns for 2 weeks
- [ ] Analyze cost impact

**Week 2-3: Response Caching**
- [ ] Set up Redis instance (or use Upstash)
- [ ] Implement caching middleware
- [ ] Add cache hit/miss metrics
- [ ] Deploy to demo endpoint first
- [ ] Monitor cache hit rate
- [ ] Expand to prospect discovery if successful

**Expected Month 2 Impact:** Variable savings (5-15% additional)

---

## Monitoring & Alerts

### Key Metrics to Track

**Cost Metrics:**
- Daily AI spend by service
- Cost per user (cohort analysis)
- Cost trend (7-day, 30-day moving average)
- Budget utilization (% of monthly cap)

**Usage Metrics:**
- Requests per service per day
- Average tokens per request
- Model distribution (% Opus vs Sonnet vs Haiku)
- Cache hit rate (if implemented)

**Quality Metrics:**
- Rating consistency (std deviation of scores)
- User satisfaction (qualitative feedback)
- Error rate by service
- Retry/failure counts

### Recommended Alerts

**Critical Alerts (PagerDuty/Slack):**
- Daily spend > $100 (likely abuse or spam)
- Error rate > 10% on any service
- Demo endpoint requests > 1,000/hour (spam attack)

**Warning Alerts (Email):**
- Weekly spend 20% above 7-day average
- Cache hit rate < 25% (caching not working)
- Opus usage detected (should be deprecated)

**Info Alerts (Dashboard):**
- Monthly spend approaching budget threshold (80%, 90%, 100%)
- Cost per user increasing week-over-week

---

## Success Metrics

### 30-Day Success Criteria

After implementing all Priority 1 & 2 optimizations:

✅ **Cost Reduction:**
- Monthly AI spend reduced by >75%
- Cost per active user < $0.50/month
- No quality degradation complaints

✅ **Protection:**
- Demo endpoint rate limiting active
- Zero spam/abuse incidents
- All public endpoints monitored

✅ **Visibility:**
- Daily cost tracking in dashboard
- Alert system operational
- Token usage trends visible

### 90-Day Success Criteria

After implementing all priorities (1, 2, 3):

✅ **Advanced Optimization:**
- Response caching implemented
- Cache hit rate >30%
- Web search costs tracked and optimized

✅ **Cost Predictability:**
- Monthly costs within ±10% variance
- Cost per user stable
- No unexpected cost spikes

✅ **Business Impact:**
- AI features remain high quality
- User satisfaction maintained
- $18K/year cost savings realized

---

## Risk Assessment

### Implementation Risks

**Risk 1: Quality Degradation**
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:** Thorough A/B testing, gradual rollout, easy rollback

**Risk 2: Rate Limiting False Positives**
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:** Generous limits (5/hour), clear error messages, whitelist for internal testing

**Risk 3: Caching Stale Data**
- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:** Short TTL (24h), cache invalidation on schema changes

**Risk 4: Web Search Cost Spike**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:** Max search limits, usage monitoring, alternative search APIs

---

## Appendix: Quick Reference

### Model Selection Guide

**Use Claude 3.5 Haiku when:**
- Task is well-defined and structured
- Low temperature (deterministic)
- High volume operations
- Background/batch processing
- Public endpoints (cost protection)
- Examples: Rating, demos, search

**Use Claude 3.5 Sonnet when:**
- Task requires creativity/nuance
- Medium temperature (0.6-0.8)
- User-facing features
- Complex reasoning needed
- Examples: Persona generation, strategic analysis

**Use Claude 3 Opus when:**
- Absolutely necessary (rarely)
- Highest quality required
- Complex multi-step reasoning
- Premium tier features only
- Examples: (None in current platform - Opus should be deprecated)

### Cost Calculation Formula

```javascript
function estimateCost(inputTokens, outputTokens, model) {
  const pricing = {
    'opus': { input: 15, output: 75 },
    'sonnet': { input: 3, output: 15 },
    'haiku': { input: 0.25, output: 1.25 }
  };
  
  const p = pricing[model];
  return ((inputTokens * p.input) + (outputTokens * p.output)) / 1_000_000;
}

// Example:
// 1,500 input, 800 output, Sonnet
// Cost = ((1500 * 3) + (800 * 15)) / 1,000,000 = $0.0165
```

---

## Conclusion

This analysis identifies **$1,511.60/month ($18,139/year) in savings** through model optimization and protective measures.

**Immediate Actions (Week 1):**
1. Test and deploy Sonnet for aiRatingController (70% of savings)
2. Implement demo rate limiting (prevent abuse)

**Follow-up Actions (Month 1-2):**
3. Downgrade ratingWorker to Haiku
4. Optimize persona prompts
5. Add web search tracking and caching

The platform is already well-optimized (50% of services use Haiku), but the one Opus service accounts for 86% of projected costs. This single change drives most of the optimization value.

**Recommendation:** Implement Priority 1 optimizations immediately, then iterate on Priority 2 & 3 based on actual usage data from the cost dashboard.

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-20  
**Next Review:** After Priority 1 implementation

