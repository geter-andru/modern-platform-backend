import Joi from 'joi';

// Customer ID validation schema
// Updated for Supabase migration - only accepts UUID format
// Strict UUID v4 format: 8-4-4-4-12 hexadecimal characters with dashes
const customerIdSchema = Joi.string()
  .uuid()
  .pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  .required()
  .messages({
    'string.guid': 'Customer ID must be a valid UUID',
    'string.pattern.base': 'Customer ID must be a valid UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
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

// Cost calculation save validation schema (for saving already-calculated results)
const costCalculationSaveSchema = Joi.object({
  customerId: customerIdSchema,
  calculations: Joi.object().required() // Accept any calculations object
});

// Cost calculation compare scenarios validation schema
const costCalculationCompareSchema = Joi.object({
  customerId: customerIdSchema,
  baseInputs: Joi.object({
    potentialDeals: Joi.number().min(0).max(10000).required(),
    averageDealSize: Joi.number().min(0).max(10000000).required(),
    conversionRate: Joi.number().min(0).max(1).required(),
    delayMonths: Joi.number().min(0).max(24).required(),
    currentOperatingCost: Joi.number().min(0).max(100000000).required(),
    inefficiencyRate: Joi.number().min(0).max(1).required(),
    employeeCount: Joi.number().min(1).max(100000).required(),
    averageSalary: Joi.number().min(0).max(1000000).required(),
    marketShare: Joi.number().min(0).max(1).required()
  }).required(),
  scenarios: Joi.array().items(
    Joi.string().valid('conservative', 'realistic', 'aggressive')
  ).min(1).max(3).required()
});

// Authentication validation schemas
const authSchemas = {
  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required'
    })
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
  type: Joi.string().valid('pilot', 'full', 'full_implementation').required(),
  requirements: Joi.object({
    timeline: Joi.string().min(1).max(100).required(), // e.g., "3-6 months"
    budget: Joi.number().min(0).max(10000000).required(),
    teamSize: Joi.number().min(1).max(10000).optional(),
    successMetrics: Joi.array().items(Joi.string().min(5).max(200)).min(1).max(10).required()
  }).required(),
  context: Joi.object({
    industry: Joi.string().min(2).max(100).required(),
    companySize: Joi.string().min(2).max(100).required(),
    currentChallenges: Joi.array().items(Joi.string().min(5).max(500)).min(1).max(20).optional()
  }).required()
});

// Export format validation schema (simple - just format validation)
const exportFormatSchema = Joi.object({
  customerId: customerIdSchema,
  format: Joi.string().valid('pdf', 'docx', 'xlsx', 'json', 'csv').required(),
  options: Joi.object().optional() // Optional export options
});

// Comprehensive export validation schema
const comprehensiveExportSchema = Joi.object({
  customerId: customerIdSchema,
  format: Joi.string().valid('pdf', 'docx', 'xlsx', 'json', 'csv').required(),
  sections: Joi.array().items(
    Joi.string().valid('icp', 'cost-calculator', 'business-case', 'progress')
  ).min(1).required(),
  options: Joi.object().optional()
});

// Business case export validation schema
const businessCaseExportSchema = Joi.object({
  customerId: customerIdSchema,
  businessCaseId: Joi.string().required(),
  format: Joi.string().valid('pdf', 'docx').required()
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
  costCalculationSaveSchema,
  costCalculationCompareSchema,
  businessCaseSchema,
  businessCaseExportSchema,
  exportFormatSchema,
  comprehensiveExportSchema,
  paramSchemas,
  authSchemas
};