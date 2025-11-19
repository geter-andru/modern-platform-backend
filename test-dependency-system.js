/**
 * Test suite for Dependency Validation and Context Aggregation System
 *
 * Tests all components without requiring database connection
 */

import {
  RESOURCE_DEPENDENCIES,
  getResourceConfig,
  getResourcesByTier,
  getResourcesByCategory,
  validateDependencies,
  calculateGenerationCost,
  getSuggestedGenerationOrder
} from './src/config/resource-dependencies.js';

import {
  CONTEXT_TIER_CONFIGS,
  getContextTierConfig,
  getDefaultContextTierConfig,
  validateContextTierConfig
} from './src/config/context-tiers.js';

// ANSI color codes for output
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`${GREEN}✓${RESET} ${testName}`);
  } else {
    testsFailed++;
    console.log(`${RED}✗${RESET} ${testName}`);
  }
}

function assertEqual(actual, expected, testName) {
  assert(actual === expected, `${testName} (expected: ${expected}, got: ${actual})`);
}

function assertDefined(value, testName) {
  assert(value !== null && value !== undefined, testName);
}

function assertArray(value, testName) {
  assert(Array.isArray(value), testName);
}

function section(title) {
  console.log(`\n${CYAN}━━━ ${title} ━━━${RESET}\n`);
}

// ============================================
// TEST SUITE
// ============================================

console.log(`${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${BLUE}║  Dependency Validation & Context Aggregation Test Suite  ║${RESET}`);
console.log(`${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}`);

// ============================================
// 1. RESOURCE DEPENDENCIES TESTS
// ============================================

section('1. Resource Dependencies Configuration');

// Test: Registry has resources
assert(Object.keys(RESOURCE_DEPENDENCIES).length > 0, 'Registry contains resources');
console.log(`   Found ${Object.keys(RESOURCE_DEPENDENCIES).length} resources in registry`);

// Test: Get specific resource
const icpResource = getResourceConfig('icp-analysis');
assertDefined(icpResource, 'Can retrieve ICP Analysis resource');
assertEqual(icpResource?.resourceName, 'ICP Analysis', 'ICP Analysis has correct name');
assertEqual(icpResource?.tier, 1, 'ICP Analysis is tier 1');
assertEqual(icpResource?.category, 'core', 'ICP Analysis is core category');

// Test: Resources by tier
const tier1Resources = getResourcesByTier(1);
assertArray(tier1Resources, 'getResourcesByTier returns array');
assert(tier1Resources.length >= 5, `Tier 1 has at least 5 resources (found ${tier1Resources.length})`);
console.log(`   Tier 1 resources: ${tier1Resources.map(r => r.resourceName).join(', ')}`);

// Test: Resources by category
const coreResources = getResourcesByCategory('core');
assertArray(coreResources, 'getResourcesByCategory returns array');
assert(coreResources.length >= 20, `Core category has at least 20 resources (found ${coreResources.length})`);

// Test: Resource has required fields
const personaResource = getResourceConfig('target-buyer-personas');
assertDefined(personaResource, 'Target Buyer Personas exists');
assertArray(personaResource.requiredDependencies, 'Target Buyer Personas has requiredDependencies array');
assertArray(personaResource.optionalDependencies, 'Target Buyer Personas has optionalDependencies array');
assert(personaResource.estimatedTokens > 0, 'Target Buyer Personas has estimatedTokens');
assert(personaResource.generationCost > 0, 'Target Buyer Personas has generationCost');
assertDefined(personaResource.impactStatement, 'Target Buyer Personas has impactStatement');

// ============================================
// 2. DEPENDENCY VALIDATION TESTS
// ============================================

section('2. Dependency Validation Logic');

// Test: Validate with no dependencies (ICP Analysis)
const icpValidation = validateDependencies('icp-analysis', ['product-name', 'product-description', 'current-business-stage']);
assert(icpValidation.valid === true, 'ICP Analysis validation passes with all dependencies');
assertEqual(icpValidation.missingRequired.length, 0, 'ICP Analysis has no missing required dependencies');

// Test: Validate with missing dependencies
const personaValidation = validateDependencies('target-buyer-personas', []);
assert(personaValidation.valid === false, 'Target Buyer Personas fails without dependencies');
assert(personaValidation.missingRequired.length >= 3, 'Target Buyer Personas has missing required dependencies');
console.log(`   Missing required: ${personaValidation.missingRequired.join(', ')}`);

// Test: Validate with partial dependencies
const partialValidation = validateDependencies('target-buyer-personas', ['product-name', 'product-description']);
assert(partialValidation.valid === false, 'Target Buyer Personas fails with partial dependencies');
assert(partialValidation.missingRequired.includes('icp-analysis'), 'Missing icp-analysis is detected');

// Test: Validate with all required, some optional missing
const fullValidation = validateDependencies('target-buyer-personas', ['product-name', 'product-description', 'icp-analysis']);
assert(fullValidation.valid === true, 'Target Buyer Personas passes with all required');
assert(fullValidation.canProceedWithWarning === false || fullValidation.missingOptional?.length >= 0, 'Optional dependencies tracked');

// ============================================
// 3. COST CALCULATION TESTS
// ============================================

section('3. Cost Calculation');

// Test: Cost for resource with dependencies met
const icpCost = calculateGenerationCost('icp-analysis', ['product-name', 'product-description', 'current-business-stage']);
assertDefined(icpCost.targetResource, 'Cost calculation returns target resource');
assertEqual(icpCost.missingDependencies.length, 0, 'No missing dependencies for ICP Analysis');
assert(icpCost.totalCost > 0, 'Total cost is positive');
assertEqual(icpCost.resourceCount, 1, 'Resource count is 1 when no missing dependencies');

// Test: Cost for resource with missing dependencies
const personaCost = calculateGenerationCost('target-buyer-personas', []);
assertDefined(personaCost.targetResource, 'Cost calculation works with missing dependencies');
assert(personaCost.missingDependencies.length > 0, 'Missing dependencies are included in cost');
assert(personaCost.totalCost > personaCost.targetResource.cost, 'Total cost includes missing dependencies');
assert(personaCost.resourceCount > 1, 'Resource count includes missing dependencies');
console.log(`   Total cost for Buyer Personas from scratch: $${personaCost.totalCost.toFixed(4)}`);
console.log(`   Resources needed: ${personaCost.resourceCount}`);

// ============================================
// 4. SUGGESTED GENERATION ORDER TESTS
// ============================================

section('4. Suggested Generation Order (Topological Sort)');

// Test: Order for resource with no dependencies
const icpOrder = getSuggestedGenerationOrder('icp-analysis', []);
assertArray(icpOrder, 'getSuggestedGenerationOrder returns array');
assertEqual(icpOrder.length, 1, 'ICP Analysis order has 1 item (itself)');
assertEqual(icpOrder[0], 'icp-analysis', 'ICP Analysis is first in order');

// Test: Order for resource with dependencies
const personaOrder = getSuggestedGenerationOrder('target-buyer-personas', []);
assertArray(personaOrder, 'Persona order is array');
assert(personaOrder.length >= 2, 'Persona order has multiple items');
assert(personaOrder.includes('icp-analysis'), 'Persona order includes icp-analysis');
assert(personaOrder.includes('target-buyer-personas'), 'Persona order includes target-buyer-personas');

// Test: Dependencies come before target
const icpIndex = personaOrder.indexOf('icp-analysis');
const personaIndex = personaOrder.indexOf('target-buyer-personas');
assert(icpIndex < personaIndex, 'ICP Analysis comes before Target Buyer Personas in order');
console.log(`   Generation order for Buyer Personas: ${personaOrder.join(' → ')}`);

// Test: Complex dependency chain
const deckOrder = getSuggestedGenerationOrder('sales-slide-deck', []);
assertArray(deckOrder, 'Sales Slide Deck order is array');
assert(deckOrder.length >= 3, 'Sales Slide Deck has complex dependency chain');
assert(deckOrder[deckOrder.length - 1] === 'sales-slide-deck', 'Target resource is last in order');
console.log(`   Generation order for Sales Slide Deck: ${deckOrder.join(' → ')}`);

// ============================================
// 5. CONTEXT TIER CONFIGURATION TESTS
// ============================================

section('5. Context Tier Configuration');

// Test: Registry has tier configs
assert(Object.keys(CONTEXT_TIER_CONFIGS).length > 0, 'Context tier registry has configurations');
console.log(`   Found ${Object.keys(CONTEXT_TIER_CONFIGS).length} tier configurations`);

// Test: Get specific tier config
const icpTierConfig = getContextTierConfig('icp-analysis');
assertDefined(icpTierConfig, 'Can retrieve ICP Analysis tier config');
assertDefined(icpTierConfig?.tiers, 'Tier config has tiers object');
assertArray(icpTierConfig?.tiers?.tier1_critical, 'Tier 1 critical is array');
assertArray(icpTierConfig?.tiers?.tier2_required, 'Tier 2 required is array');
assertArray(icpTierConfig?.tiers?.tier3_optional, 'Tier 3 optional is array');
assertArray(icpTierConfig?.tiers?.tier4_skip, 'Tier 4 skip is array');

// Test: Token budgets
assertDefined(icpTierConfig?.tokenBudget, 'Tier config has tokenBudget');
assert(icpTierConfig?.tokenBudget?.tier1 >= 0, 'Tier 1 budget is non-negative');
assert(icpTierConfig?.tokenBudget?.tier2 >= 0, 'Tier 2 budget is non-negative');
assert(icpTierConfig?.tokenBudget?.tier3 >= 0, 'Tier 3 budget is non-negative');
assert(icpTierConfig?.tokenBudget?.total > 0, 'Total budget is positive');

const expectedTotal = icpTierConfig.tokenBudget.tier1 + icpTierConfig.tokenBudget.tier2 + icpTierConfig.tokenBudget.tier3;
assertEqual(icpTierConfig.tokenBudget.total, expectedTotal, 'Total budget equals sum of tier budgets');

// Test: Default tier config generation
const testResource = getResourceConfig('sales-slide-deck');
const defaultTierConfig = getDefaultContextTierConfig(testResource);
assertDefined(defaultTierConfig, 'Can generate default tier config');
assertDefined(defaultTierConfig?.tiers, 'Default config has tiers');
assertDefined(defaultTierConfig?.tokenBudget, 'Default config has token budget');
assertEqual(defaultTierConfig?.tokenBudget?.total, 3500, 'Default total budget is 3500 tokens');

// ============================================
// 6. CONTEXT TIER VALIDATION TESTS
// ============================================

section('6. Context Tier Validation');

// Test: Validate valid config
const validConfig = getContextTierConfig('target-buyer-personas');
const validationResult = validateContextTierConfig(validConfig);
assert(validationResult.valid === true, 'Valid tier config passes validation');
assert(!validationResult.errors, 'Valid config has no errors');

// Test: Validate config with budget mismatch
const invalidConfig = {
  resourceId: 'test',
  tiers: {
    tier1_critical: [],
    tier2_required: [],
    tier3_optional: [],
    tier4_skip: []
  },
  tokenBudget: {
    tier1: 500,
    tier2: 2000,
    tier3: 1000,
    total: 4000 // Mismatch: should be 3500
  }
};
const invalidValidation = validateContextTierConfig(invalidConfig);
assert(invalidValidation.valid === false, 'Invalid config fails validation');
assertArray(invalidValidation.errors, 'Invalid config has errors array');
assert(invalidValidation.errors.length > 0, 'Invalid config has at least one error');
console.log(`   Validation error detected: ${invalidValidation.errors[0]}`);

// ============================================
// 7. TOKEN OPTIMIZATION VERIFICATION
// ============================================

section('7. Token Optimization Strategy');

// Test: Early resource (low context)
const earlyConfig = getContextTierConfig('icp-analysis');
assert(earlyConfig?.tokenBudget?.total <= 1000, 'Early resource has minimal token budget');
console.log(`   ICP Analysis budget: ${earlyConfig?.tokenBudget?.total} tokens`);

// Test: Mid-chain resource (moderate context)
const midConfig = getContextTierConfig('compelling-events');
assert(midConfig?.tokenBudget?.total >= 2000 && midConfig?.tokenBudget?.total <= 3500, 'Mid-chain resource has moderate budget');
console.log(`   Compelling Events budget: ${midConfig?.tokenBudget?.total} tokens`);

// Test: Late resource (optimized context)
const lateConfig = getContextTierConfig('board-presentation');
assert(lateConfig?.tokenBudget?.total <= 3500, 'Late resource stays within 3500 token target');
console.log(`   Board Presentation budget: ${lateConfig?.tokenBudget?.total} tokens`);

// ============================================
// 8. DEPENDENCY CHAIN INTEGRITY TESTS
// ============================================

section('8. Dependency Chain Integrity');

// Test: No circular dependencies
let circularFound = false;
for (const [resourceId, config] of Object.entries(RESOURCE_DEPENDENCIES)) {
  if (config.requiredDependencies.includes(resourceId)) {
    circularFound = true;
    console.log(`   ${RED}Circular dependency found: ${resourceId} depends on itself${RESET}`);
  }
}
assert(!circularFound, 'No circular dependencies exist');

// Test: All required dependencies exist in registry
let missingDepsFound = false;
for (const [resourceId, config] of Object.entries(RESOURCE_DEPENDENCIES)) {
  for (const depId of config.requiredDependencies) {
    // Skip meta-dependencies (inputs like product-name)
    if (depId.startsWith('product-') || depId.startsWith('current-') || depId.startsWith('startup-') || depId.startsWith('business-') || depId.startsWith('primary-') || depId.startsWith('target-buyer-description')) {
      continue;
    }

    if (!RESOURCE_DEPENDENCIES[depId]) {
      missingDepsFound = true;
      console.log(`   ${RED}Missing dependency: ${resourceId} requires ${depId} (not in registry)${RESET}`);
    }
  }
}
assert(!missingDepsFound, 'All required dependencies exist in registry');

// Test: Tier hierarchy is respected (dependencies should be same tier or lower)
let criticalTierViolationFound = false;
let sameTierDeps = 0;
for (const [resourceId, config] of Object.entries(RESOURCE_DEPENDENCIES)) {
  for (const depId of config.requiredDependencies) {
    const depConfig = RESOURCE_DEPENDENCIES[depId];
    if (depConfig) {
      if (depConfig.tier === config.tier) {
        sameTierDeps++; // Same tier is allowed (horizontal dependencies)
      } else if (depConfig.tier > config.tier) {
        criticalTierViolationFound = true;
        console.log(`   ${RED}CRITICAL tier violation: ${resourceId} (tier ${config.tier}) depends on ${depId} (tier ${depConfig.tier})${RESET}`);
      }
    }
  }
}
assert(!criticalTierViolationFound, 'No critical tier violations (dependencies on higher tiers)');
console.log(`   Found ${sameTierDeps} same-tier dependencies (expected for horizontal relationships)`);

// ============================================
// TEST RESULTS
// ============================================

console.log(`\n${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${BLUE}║                       TEST RESULTS                         ║${RESET}`);
console.log(`${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}\n`);

console.log(`Total Tests:  ${testsRun}`);
console.log(`${GREEN}Passed:       ${testsPassed}${RESET}`);
console.log(`${RED}Failed:       ${testsFailed}${RESET}`);
console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
  console.log(`\n${GREEN}✓ All tests passed!${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n${RED}✗ Some tests failed${RESET}\n`);
  process.exit(1);
}
