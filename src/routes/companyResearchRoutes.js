/**
 * Company Research Routes
 */

import express from 'express';
import {
  researchCompany,
  getResearchedCompanies,
  clearResearchCache
} from '../controllers/companyResearchController.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const researchCompanySchema = Joi.object({
  companyName: Joi.string().min(2).max(100).required(),
  depth: Joi.string().valid('basic', 'comprehensive', 'deep').default('comprehensive'),
  forceRefresh: Joi.boolean().default(false)
});

const clearCacheSchema = Joi.object({
  companyName: Joi.string().min(2).max(100).optional()
});

// Routes
router.post(
  '/research',
  authenticate,
  validate(researchCompanySchema),
  researchCompany
);

router.get(
  '/researched',
  authenticate,
  getResearchedCompanies
);

router.post(
  '/clear-cache',
  authenticate,
  validate(clearCacheSchema),
  clearResearchCache
);

export default router;