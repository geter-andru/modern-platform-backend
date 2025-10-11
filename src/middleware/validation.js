import Joi from 'joi';

// Customer ID validation schema
// ENHANCED (2025-10-11): Supports UUID (regular customers) + service accounts + test IDs
// - UUID format: Standard Supabase customer IDs
// - Service accounts: IDs starting with 'service_' (e.g., service_frontend_nextjs)
// - Test IDs: IDs starting with 'test-' (for development/testing)
const customerIdSchema = Joi.alternatives().try(
  Joi.string().uuid(),  // Regular UUID customers
  Joi.string().pattern(/^service_[a-z0-9_]+$/),  // Service accounts
  Joi.string().pattern(/^test-[a-z0-9-]+$/)  // Test customers
).required().messages({
  'alternatives.match': 'Customer ID must be a valid UUID, service account (service_*), or test ID (test-*)',
  'any.required': 'Customer ID is required'
});

// Cost calculation validation schema
const costCalculationSchema = Joi.object({
  customerId: customerIdSchema,
  potentialDeals: Joi.number().min(0).max(10000).required(),
  averageDealSize: Joi.number().min(0).max(10000000).required(),
  conversionRate: Joi.number().min(0).max(1).required(),
  delayMonths: Joi.number().min(0).max(24).required(),
  currentOperatingCost: Joi.number().min(0).max(100000000).required(),
  inefficiencyRate: Joi.number().min(0).max(1).required(),
  employeeCount: Joi.number().min(1).max(100000).required(),
  averageSalary: Joi.number().min(0).max(1000000).required(),
  marketShare: Joi.number().min(0).max(1).required(),
  scenario: Joi.string().valid('conservative', 'realistic', 'aggressive').default('realistic')
});

// Authentication validation schemas
const authSchemas = {
  generateToken: Joi.object({
    customerId: customerIdSchema
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required'
    })
  }),
  
  generateCustomerToken: Joi.object({
    customerId: customerIdSchema
  }),
  
  generateApiKey: Joi.object({
    customerId: customerIdSchema
  }),
  
  customerId: Joi.object({
    customerId: customerIdSchema
  })
};

// Business case generation validation schema
const businessCaseSchema = Joi.object({
  customerId: customerIdSchema,
  caseType: Joi.string().valid('pilot', 'full_implementation').required(),
  industry: Joi.string().min(2).max(100).required(),
  companySize: Joi.string().valid('startup', 'small', 'medium', 'large', 'enterprise').required(),
  budget: Joi.number().min(0).max(10000000).required(),
  timeline: Joi.number().min(1).max(24).required(), // months
  objectives: Joi.array().items(Joi.string().min(5).max(200)).min(1).max(10).required(),
  successMetrics: Joi.array().items(Joi.string().min(5).max(200)).min(1).max(10).required()
});

// Export format validation schema
const exportFormatSchema = Joi.object({
  customerId: customerIdSchema,
  format: Joi.string().valid('pdf', 'docx', 'json', 'csv').required(),
  includeData: Joi.array().items(
    Joi.string().valid('icp', 'cost_calculator', 'business_case', 'progress')
  ).min(1).required()
});

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'params' ? req.params : 
                  source === 'query' ? req.query : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      error.isJoi = true;
      return next(error);
    }

    // Replace the original data with validated and sanitized data
    if (source === 'params') {
      req.params = value;
    } else if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};

// Parameter validation schemas
const paramSchemas = {
  customerId: Joi.object({
    customerId: customerIdSchema
  }),
  
  format: Joi.object({
    customerId: customerIdSchema,
    format: Joi.string().valid('pdf', 'docx', 'json', 'csv').required()
  })
};

export {
  validate,
  customerIdSchema,
  costCalculationSchema,
  businessCaseSchema,
  exportFormatSchema,
  paramSchemas,
  authSchemas
};