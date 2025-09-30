/**
 * Simple authentication middleware wrapper
 * Delegates to the existing auth middleware
 */

import { authenticateMulti } from './auth.js';

// Export as default for simpler imports
export default authenticateMulti;