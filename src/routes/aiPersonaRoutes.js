/**
 * AI Persona Routes
 * Handles AI-powered buyer persona generation using Anthropic Claude
 */

import express from 'express';
import {
  generatePersonas,
  getCurrentUserPersonas
} from '../controllers/aiPersonaController.js';
import { authenticateSupabaseJWT } from '../middleware/supabaseAuth.js';
import { customerRateLimit } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/ai/generate-personas
 * Generate 3-5 buyer personas using Claude AI
 *
 * Rate limit: 5 requests per hour (AI generation is expensive)
 * Auth: Required (Supabase JWT)
 *
 * Request body:
 * {
 *   companyContext: string (required, min 10 chars)
 *   industry: string (required, min 2 chars)
 *   targetMarket: string (optional)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   personas: [...],
 *   savedId: uuid,
 *   metadata: { ... }
 * }
 */
router.post(
  '/generate-personas',
  customerRateLimit(5, 60 * 60 * 1000), // 5 requests per hour
  authenticateSupabaseJWT,
  generatePersonas
);

/**
 * GET /api/personas/current-user
 * Get all saved personas for authenticated user
 *
 * Rate limit: 30 requests per 15 minutes
 * Auth: Required (Supabase JWT)
 *
 * Response:
 * {
 *   success: true,
 *   personas: [...],
 *   metadata: {
 *     count: number,
 *     mostRecent: timestamp
 *   }
 * }
 */
router.get(
  '/personas/current-user',
  customerRateLimit(30, 15 * 60 * 1000), // 30 requests per 15 minutes
  authenticateSupabaseJWT,
  getCurrentUserPersonas
);

export default router;
