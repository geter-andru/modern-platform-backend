# COMPREHENSIVE BACKEND ARCHITECTURE REPORT
## H&S Platform - Revenue Intelligence API

**Generated:** 2025-10-23  
**Report Type:** Very Thorough Architectural Analysis  
**Environment:** Production-Ready API Backend

---

## 1. BACKEND FRAMEWORK & TECHNOLOGY STACK

### Core Framework
- **Primary Framework:** Express.js (v4.18.2)
- **Runtime:** Node.js (v18+)
- **Language:** JavaScript (ES6 Modules)
- **Type System:** Dynamic JavaScript (no TypeScript in src/)
- **API Style:** RESTful HTTP JSON

### Key Dependencies
```
Core Dependencies:
- express@4.18.2 - Web framework
- @supabase/supabase-js@2.58.0 - Backend database client
- jsonwebtoken@9.0.2 - JWT token handling
- joi@17.11.0 - Data validation
- bcryptjs@3.0.2 - Password hashing
- winston@3.11.0 - Structured logging
- helmet@7.1.0 - Security headers
- cors@2.8.5 - Cross-origin support
- express-rate-limit@7.1.5 - Rate limiting
- compression@1.7.4 - Response compression
- morgan@1.10.0 - HTTP request logging
- @sentry/node@10.20.0 - Error tracking
- stripe@19.1.0 - Payment processing
- uuid@11.1.0 - ID generation
- dotenv@16.6.1 - Environment config
```

### Optional/Legacy Dependencies
- airtable@0.12.2 (DEPRECATED - Legacy data source)
- axios - Company research web scraping

---

## 2. API ROUTES & ENDPOINTS

### Entry Point
- **Main Server:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/server.js` (Lines 1-125)
- **Router Registration:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/index.js` (Lines 1-342)

### Health & Status Endpoints (Public)
| Method | Route | Handler | Rate Limit | Auth |
|--------|-------|---------|-----------|------|
| GET | `/health` | healthController.checkHealth | None | Public |
| GET | `/health/detailed` | healthController.checkHealthDetailed | None | Public |
| GET | `/api/docs` | routes/index.js (inline) | None | Public |

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/controllers/healthController.js` (Lines 1-86)

### Authentication Routes
| Method | Route | Handler | Rate Limit | Auth Required |
|--------|-------|---------|-----------|--------------|
| GET | `/api/auth/status` | authController.authStatus | None | No |
| POST | `/api/auth/refresh` | authController.refreshToken | 10/15min | Validation Schema |
| GET | `/api/auth/verify` | authController.verifyToken | 50/15min | Validation Schema |
| POST | `/api/auth/api-key` | authController.generateApiKey | 3/hour | Validation Schema |
| GET | `/api/auth/permissions` | authController.getPermissions | None | authenticateMulti |
| GET | `/api/auth/permissions/:customerId` | authController.getPermissions | None | authenticateMulti |
| GET | `/api/auth/validate` | authController.validateAuth | None | authenticateMulti |

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/auth.js` (Lines 1-79)

### Customer Management Routes
| Method | Route | Handler | Rate Limit | Auth |
|--------|-------|---------|-----------|------|
| GET | `/api/customer/:customerId` | customerController.getCustomer | 50/15min | authenticateMulti |
| GET | `/api/customer/:customerId/icp` | customerController.getCustomerICP | 30/15min | authenticateMulti |
| PUT | `/api/customer/:customerId` | customerController.updateCustomer | 20/15min | authenticateMulti |
| POST | `/api/customer/:customerId/generate-icp` | customerController.generateAIICP | 5/hour | authenticateMulti |
| POST | `/api/products/save` | customerController.saveProduct | 30/15min | authenticateMulti |
| GET | `/api/products/history` | customerController.getProductHistory | 30/15min | authenticateMulti |
| GET | `/api/products/current-user` | customerController.getCurrentProduct | 30/15min | authenticateMulti |
| GET | `/api/customers` | customerController.getAllCustomers | strict (10/15min) | authenticateMulti |

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/index.js` (Lines 40-98)

### Cost Calculator Routes
| Method | Route | Handler | Rate Limit | Auth |
|--------|-------|---------|-----------|------|
| POST | `/api/cost-calculator/calculate` | costCalculatorController.calculateCost | 30/15min | authenticateMulti |
| POST | `/api/cost-calculator/calculate-ai` | costCalculatorController.calculateCostWithAI | 5/hour | authenticateMulti |
| POST | `/api/cost-calculator/save` | costCalculatorController.saveCostCalculation | 20/15min | authenticateMulti |
| GET | `/api/cost-calculator/history/:customerId` | costCalculatorController.getCostCalculationHistory | 25/15min | authenticateMulti |
| POST | `/api/cost-calculator/compare` | costCalculatorController.compareCostScenarios | 15/15min | authenticateMulti |

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/index.js` (Lines 100-135)

### Business Case Routes
| Method | Route | Handler | Rate Limit | Auth |
|--------|-------|---------|-----------|------|
| POST | `/api/business-case/generate` | businessCaseController.generateBusinessCase | 10/15min | authenticateMulti |
| POST | `/api/business-case/generate-simple` | businessCaseController.generateSimplifiedBusinessCase | 15/15min | authenticateMulti |
| POST | `/api/business-case/customize` | businessCaseController.customizeBusinessCase | 15/15min | authenticateMulti |
| POST | `/api/business-case/save` | businessCaseController.saveBusinessCase | 20/15min | authenticateMulti |
| POST | `/api/business-case/export` | businessCaseController.exportBusinessCase | 5/15min | authenticateMulti |
| GET | `/api/business-case/templates` | businessCaseController.getTemplates | 50/15min | authenticateMulti |
| GET | `/api/business-case/:customerId/history` | businessCaseController.getBusinessCaseHistory | 25/15min | authenticateMulti |

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/index.js` (Lines 137-182)

### Export Routes
| Method | Route | Handler | Rate Limit | Auth |
|--------|-------|---------|-----------|------|
| POST | `/api/export/icp` | exportController.exportICP | 10/15min | authenticateMulti |
| POST | `/api/export/cost-calculator` | exportController.exportCostCalculator | 10/15min | authenticateMulti |
| POST | `/api/export/business-case` | exportController.exportBusinessCase | 10/15min | authenticateMulti |
| POST | `/api/export/comprehensive` | exportController.exportComprehensive | 5/15min | authenticateMulti |
| GET | `/api/export/status/:exportId` | exportController.getExportStatus | 50/15min | authenticateMulti |
| DELETE | `/api/export/:exportId` | exportController.deleteExport | 20/15min | authenticateMulti |
| GET | `/api/export/history/:customerId` | exportController.getExportHistory | 25/15min | authenticateMulti |
| POST | `/api/resources/export` | exportController.exportResource | 30/15min | authenticateMulti |
| GET | `/api/resources/:id/content` | exportController.getResourceContent | 50/15min | authenticateMulti |
| POST | `/api/resources/:id/access` | exportController.trackResourceAccess | 100/15min | authenticateMulti |
| POST | `/api/resources/share` | exportController.shareResource | 20/15min | authenticateMulti |

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/index.js` (Lines 184-254)

### Progress Tracking Routes
| Method | Route | Handler | Rate Limit | Auth |
|--------|-------|---------|-----------|------|
| GET | `/api/progress/:customerId` | progressController.getProgress | 100/15min | authenticateMulti |
| POST | `/api/progress/:customerId/track` | progressController.trackAction | 50/15min | authenticateMulti |
| GET | `/api/progress/:customerId/milestones` | progressController.getMilestones | 100/15min | authenticateMulti |
| GET | `/api/progress/:customerId/insights` | progressController.getInsights | 20/15min | authenticateMulti |
| POST | `/api/progress/:customerId/milestones/:milestoneId/complete` | progressController.completeMilestone | 10/15min | authenticateMulti |
| GET | `/api/progress` | progressController.getProgressAnalytics | 10/hour | authenticateMulti |

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/progress.js` (Lines 1-74)

### Webhook Routes
| Method | Route | Handler | Rate Limit | Auth |
|--------|-------|---------|-----------|------|
| POST | `/api/webhooks/incoming` | webhookController.handleIncomingWebhook | 50/15min | Optional |
| POST | `/api/webhooks/trigger` | webhookController.triggerAutomation | 20/15min | authenticateMulti |
| GET | `/api/webhooks/test/:webhookType` | webhookController.testWebhooks | 10/15min | authenticateMulti |
| GET | `/api/webhooks/status` | webhookController.getAutomationStatus | 100/15min | optionalSupabaseAuth |
| GET | `/api/webhooks/health` | (inline) | 200/15min | Public |

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/webhooks.js` (Lines 1-85)

### Payment Routes (Stripe Integration)
| Method | Route | Handler | Rate Limit | Auth |
|--------|-------|---------|-----------|------|
| POST | `/api/payment/create-subscription` | (payment.js) | Default | authenticateSupabaseJWT |
| POST | `/api/payment/webhook` | (payment.js) | Default | Stripe Signature |
| GET | `/api/payment/subscription-status` | (payment.js) | Default | authenticateSupabaseJWT |

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/payment.js` (Lines 1-60+)

### Job Queue Routes (Next.js App Router)
| Method | Route | Handler | Rate Limit | Auth |
|--------|-------|---------|-----------|------|
| POST | `/api/jobs` | createJob | 30/minute | Rate Limited |
| GET | `/api/jobs?status=...&limit=X&offset=Y` | getJobs | 30/minute | Rate Limited |
| GET | `/api/jobs?stats` | getJobStats | 30/minute | Rate Limited |
| DELETE | `/api/jobs?jobId=X&action=Y` | deleteJob (admin) | 30/minute | Admin Auth |

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/app/api/jobs/route.ts` (Lines 1-354)

---

## 3. DATABASE SETUP & ORM/QUERY TOOLS

### Primary Database: Supabase PostgreSQL

**Configuration:**
- **Supabase URL:** Environment variable `SUPABASE_URL`
- **Service Role Key:** Environment variable `SUPABASE_SERVICE_ROLE_KEY`
- **Client Library:** @supabase/supabase-js@2.58.0

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/services/supabaseService.js` (Lines 1-61)

### Main Tables

#### 1. customer_assets
Stores customer profile and generated content
```
Columns:
- id (UUID, primary key)
- customer_id (UUID, user ID from Supabase Auth)
- customer_name (text)
- email (text)
- company (text)
- icp_content (JSONB) - Ideal Customer Profile
- cost_calculator_content (JSONB) - Cost analysis data
- business_case_content (JSONB) - Business case data
- tool_access_status (text) - Access level tracking
- content_status (text) - Status of generated content
- payment_status (text) - Subscription/payment status
- usage_count (integer) - API usage counter
- last_accessed (timestamp) - Last access time
- created_at (timestamp)
- updated_at (timestamp)
```

#### 2. user_progress
Tracks customer progress through platform milestones
```
Columns:
- customer_id (UUID)
- milestone_id (text)
- completed (boolean)
- completed_at (timestamp)
- progress_percentage (integer)
- last_updated (timestamp)
```

#### 3. api_keys
Manages API key generation for external integrations
```
Columns:
- id (UUID)
- customer_id (UUID)
- api_key (text, unique)
- name (text)
- created_at (timestamp)
- expires_at (timestamp, nullable)
```

### Query Interface

**Service Layer:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/services/supabaseDataService.js` (Lines 1-100+)

**Methods:**
- `getCustomerById(customerId)` - Fetch customer by ID (Lines 17-54)
- `updateCustomer(customerId, updateData)` - Update customer record (Lines 62-93)
- `getAllCustomers(limit = 100)` - Fetch customers with limit (Lines 100+)
- `getCustomerByEmail(email)` - Lookup by email
- `createCustomer(data)` - Create new customer record
- `deleteCustomer(customerId)` - Soft/hard delete

**Field Mapping:**
The service transforms between Airtable field names (spaces) and Supabase column names (underscores):
- `Customer Name` → `customer_name`
- `ICP Content` → `icp_content`
- `Cost Calculator Content` → `cost_calculator_content`
- `Business Case Content` → `business_case_content`

### Migration Status
- **Status:** Complete - Supabase is primary database
- **Legacy:** Airtable integration is deprecated but configured
- **Fallback:** If Airtable credentials missing, service logs warning but continues

---

## 4. AUTHENTICATION & AUTHORIZATION

### Authentication Methods

#### 1. Supabase JWT (Primary - Production)
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/supabaseAuth.js` (Lines 1-195)

**Flow:**
1. Frontend authenticates with Supabase Auth
2. Frontend receives Supabase JWT token
3. Frontend sends token in `Authorization: Bearer <token>` header
4. Backend validates token using Supabase service role key
5. Maps Supabase user ID to `req.auth.customerId`

**Handler:** `authenticateSupabaseJWT()` (Lines 11-140)
- Validates JWT signature and expiration
- Extracts user ID from Supabase token
- Test environment bypass for testing (Lines 12-56)
- Production validation using Supabase API (Lines 58-140)

#### 2. API Key Authentication (External Integrations)
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/auth.js` (Lines 10-48)

**Handler:** `authenticateApiKey()` (Lines 10-48)
- Accepts API key via header `X-API-Key` or query param `apiKey`
- Validates against stored API keys in database
- Maps to customer context

#### 3. Multi-Method Authentication (Hybrid)
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/auth.js` (Lines 54-78)

**Handler:** `authenticateMulti()` (Lines 54-78)
- Tries Supabase JWT first (primary)
- Falls back to API key if no JWT
- Returns 401 if neither method succeeds

#### 4. Optional Supabase Authentication
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/auth.js` (Lines 156-192)

**Handler:** `optionalSupabaseAuth()` (Lines 156-192)
- Attempts Supabase JWT authentication
- Continues without error if authentication fails
- Used for endpoints that can work with or without auth

#### 5. Legacy JWT (Deprecated)
**Status:** DEPRECATED - Only used in 2 test endpoints
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/auth.js` (Lines 205-247)

### Authorization Middleware

#### Customer Context Validation
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/auth.js` (Lines 119-146)

**Handler:** `requireCustomerContext()` (Lines 119-146)
- Ensures authenticated customer ID matches requested customer ID
- Prevents unauthorized cross-customer access
- 403 Forbidden if mismatch

#### Permission Checking
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/auth.js` (Lines 84-113)

**Handler:** `requirePermission(permission)` (Lines 84-113)
- Factory function creating middleware for specific permissions
- Checks user has required permission via authService
- 403 Forbidden if insufficient permissions

### JWT Token Management

**Service:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/services/authService.js` (Lines 1-100+)

**Key Methods:**
- `generateToken(customerId, tokenType = 'access')` (Lines 23-38)
  - Generates JWT with customerId payload
  - Includes JWT ID (jti) for token blacklisting
  - Issues: hs-platform-api
  - Audience: hs-platform-customers
  - Expiration: configurable (default 24h)

- `verifyToken(token)` (Lines 43-64)
  - Validates JWT signature and expiration
  - Returns verification result object
  - Tracks TokenExpiredError separately

- `generateRefreshToken(customerId)` (Lines 69-71)
  - Creates refresh token (longer expiration: 7d default)

- `refreshAccessToken(refreshToken)` (Lines 76-100)
  - Exchanges refresh token for new access token
  - Validates token is refresh type

### Configuration

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/config/index.js` (Lines 26-31)

```javascript
jwt: {
  secret: process.env.JWT_SECRET,           // No fallback - required
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}
```

---

## 5. KEY SERVICES & BUSINESS LOGIC

### Customer Service Layer
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/controllers/customerController.js` (Lines 1-80+)

**Key Operations:**
- `getCustomer()` - Fetch customer data with last_accessed update
- `getCustomerICP()` - Retrieve and parse ICP content (handles JSON migration)
- `updateCustomer()` - Update customer record
- `generateAIICP()` - Trigger AI-powered ICP analysis
- `saveProduct()` - Store product/tool configuration
- `getProductHistory()` - Retrieve saved products
- `getCurrentProduct()` - Get active product selection
- `getAllCustomers()` - List all customers (admin)

### Progress Tracking Service
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/services/progressService.js` (Lines 1-80+)

**Milestones Tracked:**
1. `initial_setup` (10% weight) - Account created
2. `icp_analysis` (25% weight) - ICP generated
3. `cost_calculation` (25% weight) - Cost analysis complete
4. `business_case` (30% weight) - Business case generated
5. `export_delivery` (10% weight) - Results delivered

**Key Methods:**
- `trackProgress(customerId, action, metadata)` (Lines 50-80)
  - Logs customer action
  - Detects milestone triggers
  - Calls automation on completion
- `getCurrentProgress(customerId)` - Calculate completion percentage
- `checkMilestones(action, progress)` - Check for triggered milestones
- `triggerMilestoneAutomation()` - Call Make.com webhooks

### AI Service Layer
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/services/aiService.js` (Lines 1-100+)

**Capabilities:**
- `generateICPAnalysis(customerData, businessContext)` (Lines 13-45)
  - Uses Claude 3 Sonnet model
  - Max tokens: 2000
  - Temperature: 0.7
  - Returns structured ICP with confidence metrics

- `generateCostCalculation(customerData, inputData)` (Lines 50-82)
  - Calculates cost of inaction
  - Temperature: 0.5 (more deterministic)
  - Max tokens: 1500

- `generateBusinessCase(customerData, requirements)` (Lines 87-100+)
  - Full business case generation
  - Temperature: 0.6
  - Max tokens: 3000

**Models Used:**
- Primary: claude-3-sonnet-20240229
- Fallback support for OpenAI (if OPENAI_API_KEY configured)

### Make.com Webhook Integration
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/services/makeService.js` (Lines 1-80+)

**Triggered Workflows:**
- `triggerICPAnalysis(customerData)` (Lines 12-63)
  - Webhook: MAKE_ICP_WEBHOOK env var
  - Payload includes customer profile data
  - Async HTTP POST to Make.com

- `triggerCostCalculation(customerData, calculationData)` (Lines 68-80+)
  - Webhook: MAKE_COST_CALCULATOR_WEBHOOK
  - Includes calculation inputs

- `triggerBusinessCase()` - Business case generation
  - Webhook: MAKE_BUSINESS_CASE_WEBHOOK

### Cost Calculator Logic
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/controllers/costCalculatorController.js`

**Calculation Methods:**
- `calculateCost()` - Basic cost of inaction formula
- `calculateCostWithAI()` - AI-enhanced analysis with insights
- `saveCostCalculation()` - Store results
- `getCostCalculationHistory()` - Retrieve past calculations
- `compareCostScenarios()` - Compare conservative/realistic/aggressive scenarios

**Scenarios Supported:**
- conservative
- realistic
- aggressive

### Business Case Generation
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/controllers/businessCaseController.js`

**Methods:**
- `generateBusinessCase()` - Full analysis
- `generateSimplifiedBusinessCase()` - Condensed version
- `customizeBusinessCase()` - User modifications
- `saveBusinessCase()` - Persist to database
- `exportBusinessCase()` - Generate export file
- `getTemplates()` - Available templates
- `getBusinessCaseHistory()` - Version tracking

### Export Service
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/controllers/exportController.js`

**Supported Formats:**
- JSON - Structured data
- CSV - Spreadsheet format
- PDF - Document format
- DOCX - Word document format

**Export Types:**
- ICP export
- Cost calculator export
- Business case export
- Comprehensive multi-report export
- Resource export and sharing

---

## 6. MIDDLEWARE & REQUEST HANDLING

### Middleware Stack
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/server.js` (Lines 1-125)

**Order of Execution:**
1. **Sentry Request Handler** (Line 36) - Error tracking initialization
2. **Sentry Tracing** (Line 37) - Performance monitoring
3. **Helmet Security** (Line 40) - Security headers
4. **CORS** (Line 41) - Cross-origin requests
5. **Rate Limiting** (Line 42) - Global rate limit
6. **Input Sanitization** (Line 43) - XSS prevention
7. **Compression** (Line 46) - Response compression
8. **Body Parsing** (Lines 47-48) - JSON/URL-encoded parsing
9. **Request Logging** (Line 54) - HTTP logging
10. **Request ID** (Lines 57-61) - Request tracking
11. **Routes** (Line 64) - Application routes
12. **Sentry Error Handler** (Line 67) - Error capturing
13. **Error Handler** (Line 70) - Error responses

### Security Middleware
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/security.js` (Lines 1-152)

#### Rate Limiting
- **Global Limiter** (Lines 8-26)
  - Window: 15 minutes (configurable)
  - Max requests: 100 (configurable)
  - Custom error response format

- **Strict Limiter** (Lines 29-39)
  - Window: 15 minutes (fixed)
  - Max requests: 10 per IP
  - For sensitive endpoints (/admin)

- **Customer Rate Limiter** (middleware/auth.js Lines 253-298)
  - Per-customer tracking
  - Customizable per-endpoint limits
  - Memory-based implementation

#### CORS Configuration
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/security.js` (Lines 42-73)

- **Origin Control:**
  - Development: Allows no-origin (Postman, curl)
  - Production: Strict origin validation
  - Multi-environment support (comma-separated CORS_ORIGIN)

- **Methods:** GET, POST, PUT, DELETE, OPTIONS
- **Headers:** 
  - Content-Type, Authorization, X-Requested-With
  - X-Access-Token, X-API-Key
- **Exposed Headers:** Rate-limit headers

#### Helmet Security Headers
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/security.js` (Lines 76-96)

- Content Security Policy (CSP)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

#### Input Sanitization
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/security.js` (Lines 113-143)

- Removes `<script>` tags
- Strips `javascript:` protocol
- Removes event handlers (onX= patterns)
- Applied to request body, query, and params

### Request Logging
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/security.js` (Lines 99-110)

- Logs method, URL, status code, duration (ms), IP
- Conditional logging (development uses morgan 'dev' format)
- All requests logged to Winston logger

### Data Validation Middleware
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/validation.js` (Lines 1-80+)

**Schemas Defined:**
- `customerIdSchema` - UUID validation (Lines 6-14)
- `costCalculationSchema` - Cost calculation inputs (Lines 17-29)
- `costCalculationCompareSchema` - Scenario comparison (Lines 38-54)
- `businessCaseSchema` - Business case requirements (Lines 75-80+)
- `authSchemas` - Auth endpoint schemas

**Usage:**
```javascript
router.get('/api/customer/:customerId',
  validate(paramSchemas.customerId, 'params'),
  controller
);
```

### Error Handling Middleware
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/errorHandler.js` (Lines 1-103)

**Error Types Handled:**
- Joi validation errors (400)
- Airtable API errors (400-422)
- Rate limit errors (429)
- Custom errors (uses statusCode property)
- Network errors - ECONNREFUSED (503), ENOTFOUND (502)

**Response Format:**
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "ISO timestamp",
  "support": "contact support...",
  "requestId": "request ID if available"
}
```

**Development vs Production:**
- Dev: Includes stack trace and error details
- Production: Sanitized error response

### Sentry Middleware Integration
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/middleware/sentryMiddleware.js`

- Request handler middleware
- Tracing middleware for performance
- Error handler middleware
- Auto-captures unhandled exceptions

---

## 7. CONFIGURATION & ENVIRONMENT SETUP

### Configuration File
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/config/index.js` (Lines 1-108)

### Environment Variables

#### Required Variables
```
JWT_SECRET - JWT signing key (no fallback)
SUPABASE_URL - Supabase project URL (no fallback)
SUPABASE_SERVICE_ROLE_KEY - Service role API key (no fallback)
ANTHROPIC_API_KEY - Claude AI API key
```

#### Optional Variables
```
SUPABASE_ANON_KEY - Anonymous key (optional)
AIRTABLE_API_KEY - Legacy data source
AIRTABLE_BASE_ID - Legacy base ID
SENTRY_DSN - Error tracking
STRIPE_SECRET_KEY - Payment processing
STRIPE_WEBHOOK_SECRET - Webhook validation
STRIPE_MONTHLY_PRICE_ID - Price ID
MAKE_ICP_WEBHOOK - Make.com workflow URL
MAKE_COST_CALCULATOR_WEBHOOK - Webhook URL
MAKE_BUSINESS_CASE_WEBHOOK - Webhook URL
CORS_ORIGIN - Frontend URL (multi-environment support)
```

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/.env.example` (Lines 1-191)

### Environment-Specific Configuration
- **Development:** File logging, detailed logs, localhost CORS
- **Production:** JSON logging, filtered Sentry, strict CORS
- **Test:** Environment bypass for JWT, test endpoints enabled

### Configuration Schema
```javascript
{
  server: {
    port: 3001 (default),
    nodeEnv: 'development|production|test',
    apiBaseUrl: 'http://localhost:3001'
  },
  jwt: {
    secret, expiresIn: '24h', refreshExpiresIn: '7d'
  },
  supabase: {
    url, serviceRoleKey, anonKey
  },
  airtable: {
    apiKey, baseId, tables: { customerAssets, userProgress }
  },
  webhooks: {
    icp, costCalculator, businessCase
  },
  security: {
    corsOrigin: [], 
    rateLimit: { windowMs, maxRequests, strictMax }
  },
  logging: {
    level, file, format
  }
}
```

### Logging Setup
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/utils/logger.js` (Lines 1-156)

**Logger Type:** Winston v3.11.0

**Features:**
- Structured JSON logging (Lines 47-51)
- Human-readable console format (Lines 32-44)
- File rotation (5MB max, 5 file retention)
- Separate error log file
- Exception and rejection handlers
- Child logger support for request context
- Metadata enrichment (service, environment, PID, hostname)

**Log Levels:**
error > warn > info > http > verbose > debug > silly

---

## 8. SCHEDULED JOBS & BACKGROUND TASKS

### Job Queue Management

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/app/api/jobs/route.ts` (Lines 1-354)

**Status:** REAL IMPLEMENTATION (Lines 1-20)
- Production-ready job queue management
- Real-time job status and progress tracking
- Queue statistics and health monitoring

### Job Types Supported
1. **ai-processing** - AI model invocations
2. **file-generation** - Export file creation
3. **email** - Email notifications
4. **data-analysis** - Data processing jobs

**File:** Lines 38-41 - Job processor registration

### Job API Endpoints

#### Create Job
**POST /api/jobs**
```json
{
  "type": "ai-processing|file-generation|email|data-analysis",
  "data": { /* job-specific data */ },
  "options": { /* optional queue options */ }
}
```
Returns: Job ID, type, status, creation timestamp

#### List Jobs
**GET /api/jobs**
Query parameters:
- `status` - Filter by status (waiting, active, completed, failed, delayed)
- `limit` - Results per page (max 100)
- `offset` - Pagination offset
- `userId` - Filter by user

Returns: Job list with pagination and queue stats

#### Queue Statistics
**GET /api/jobs?stats**
Returns:
- Job count by type
- Unique users count
- Queue health metrics (size, processing rate, error rate)

#### Job Management
**DELETE /api/jobs?action=X**
Actions:
- `remove` - Remove job by ID
- `clean` - Clean old jobs (default 1 hour)
- `pause` - Pause queue processing
- `resume` - Resume queue processing

**Authentication:** Admin token required

### Rate Limiting for Jobs
- 30 job operations per minute per user (Lines 44-47)

### Webhook-Based Automation

**Progress Milestone Triggers:**
When milestones complete, automatic webhooks sent to Make.com

**Files Involved:**
- progressService.js - Detects milestone completion
- makeService.js - Triggers Make.com workflows
- webhookController.js - Handles incoming responses

**Webhook Types:**
- icp_analysis_complete
- cost_calculation_complete
- business_case_complete
- progress_milestone

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/webhooks.js` (Lines 9-21)

### Scheduled Webhook Handlers

**Incoming Webhook Handler:**
```
POST /api/webhooks/incoming
Purpose: Receive completed automation results from Make.com
Rate: 50 requests per 15 minutes
Auth: Optional
```

**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/controllers/webhookController.js`

**Trigger Automation:**
```
POST /api/webhooks/trigger
Purpose: Manually trigger automation workflows
Rate: 20 requests per 15 minutes
Auth: Required
```

### Payment-Related Background Tasks

**Stripe Webhook Handling:**
**File:** `/Users/geter/andru/hs-andru-test/modern-platform/backend/src/routes/payment.js` (Lines 1-60+)

**Events Handled:**
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted

**Trial Period:** 3 days (configurable via TRIAL_PERIOD_DAYS)
**Pricing:** $99/month (via STRIPE_MONTHLY_PRICE_ID)

---

## SUMMARY STATISTICS

### Code Organization
- **Total Route Files:** 7 (auth.js, payment.js, progress.js, webhooks.js, index.js, testRoutes.js, companyResearchRoutes.js)
- **Total Controllers:** 10 (customer, cost, business case, export, auth, progress, health, webhook, company research, ICP framework)
- **Total Services:** 7 (Supabase data, auth, AI, Make, progress, Airtable legacy, sentry)
- **Total Middleware:** 6+ types (auth, security, validation, error, logging, sentry)

### API Statistics
- **Total Endpoints:** 70+
- **Health Checks:** 2
- **Public Endpoints:** 4 (health, health/detailed, auth/status, webhooks/health)
- **Authenticated Endpoints:** 60+
- **Rate-Limited Endpoints:** All protected endpoints

### Database
- **Primary DB:** Supabase PostgreSQL
- **Main Tables:** 3+ (customer_assets, user_progress, api_keys)
- **Query Method:** Supabase JavaScript client

### Security
- **Authentication:** Supabase JWT + API keys
- **Rate Limiting:** Global + per-customer limits
- **CORS:** Multi-origin support with strict validation
- **Input Validation:** Joi schema validation
- **Security Headers:** Helmet security middleware
- **Error Tracking:** Sentry integration

### Logging & Monitoring
- **Logger:** Winston v3.11.0
- **Log Rotation:** 5MB per file, 5 file retention
- **Error Tracking:** Sentry with profiling
- **Health Checks:** Basic and detailed health endpoints

