import dotenv from 'dotenv';
import winston from 'winston';

// Temporary logger for config initialization (before full logger is set up)
const configLogger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

// Load environment-specific .env file
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET, // No fallback - must be set in environment
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },

  // Airtable Configuration (DEPRECATED - kept for legacy compatibility)
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
    tables: {
      customerAssets: process.env.AIRTABLE_CUSTOMER_ASSETS_TABLE || 'Customer Assets',
      userProgress: process.env.AIRTABLE_USER_PROGRESS_TABLE || 'User Progress',
    },
  },

  // Make.com Webhooks
  webhooks: {
    icp: process.env.MAKE_ICP_WEBHOOK,
    costCalculator: process.env.MAKE_COST_CALCULATOR_WEBHOOK,
    businessCase: process.env.MAKE_BUSINESS_CASE_WEBHOOK,
  },

  // Security Configuration
  security: {
    // Support comma-separated list of CORS origins for multi-environment development
    corsOrigin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : ['http://localhost:3000'],
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      strictMax: parseInt(process.env.RATE_LIMIT_STRICT_MAX) || 20,
    },
    // Legacy JWT feature flag - default false (Supabase-only auth)
    enableLegacyJWT: process.env.ENABLE_LEGACY_JWT === 'true',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/hs-platform-api.log',
    format: process.env.LOG_FORMAT || 'combined',
  },

  // Development/Testing Configuration
  development: {
    enableTestEndpoints: process.env.ENABLE_TEST_ENDPOINTS === 'true',
    testCustomerId: process.env.TEST_CUSTOMER_ID || 'CUST_0001',
  },
};

// Validation for required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

// Validate required variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}

// Warn if Airtable variables are missing (legacy fallback)
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  configLogger.warn('airtable_config_missing', {
    legacy: true,
    message: 'Airtable configuration missing - legacy fallback disabled'
  });
}

export default config;