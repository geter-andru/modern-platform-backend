# Agent 2: Remaining Controller Fixes
**Date:** October 21, 2025
**Current Progress:** 99/157 tests (63%)
**Target:** 140/157 tests (90%)

---

## ✅ Completed Work

1. ✅ BUG-001: Customer isolation vulnerability - **CRITICAL FIX**
2. ✅ BUG-002: Cost calculator field migration - partial
3. ✅ BUG-003: Business case field migration - partial
4. ✅ BUG-004: Export controller field migration - partial

---

## 🔴 Remaining Quick Wins (15 minutes total)

### 1. webhookController.js (10 minutes)
**File:** `/backend/src/controllers/webhookController.js`
**Priority:** HIGH (automation callbacks broken)

**6 PascalCase instances to fix:**

**Line 98-100** (ICP handler):
```javascript
// ❌ OLD
const updateData = {
  'ICP Content': JSON.stringify(icpData),
  'Content Status': 'Ready',
  'Last Accessed': new Date().toISOString()
};

// ✅ NEW
const updateData = {
  icp_content: JSON.stringify(icpData),
  content_status: 'Ready',
  last_accessed: new Date().toISOString()
};
```

**Line 144-146** (Cost Calculator handler):
```javascript
// ❌ OLD
const updateData = {
  'Cost Calculator Content': JSON.stringify(costData),
  'Content Status': 'Ready',
  'Last Accessed': new Date().toISOString()
};

// ✅ NEW
const updateData = {
  cost_calculator_content: JSON.stringify(costData),
  content_status: 'Ready',
  last_accessed: new Date().toISOString()
};
```

**Line 190-192** (Business Case handler):
```javascript
// ❌ OLD
const updateData = {
  'Business Case Content': JSON.stringify(businessCaseData),
  'Content Status': 'Ready',
  'Last Accessed': new Date().toISOString()
};

// ✅ NEW
const updateData = {
  business_case_content: JSON.stringify(businessCaseData),
  content_status: 'Ready',
  last_accessed: new Date().toISOString()
};
```

**Impact:** Fixes webhook/automation integration
**Tests:** Manual testing required (no test file)
**Estimated Time:** 10 minutes

---

### 2. customerController.js Verification (5 minutes)
**File:** `/backend/src/controllers/customerController.js`
**Priority:** MEDIUM

**Action:** Verify lines 195-196 are fixed (Agent 2 may have already done this)

**Expected state:**
```javascript
// Should be:
icp_content: JSON.stringify(icpContent),
content_status: 'Ready',
```

**Current test status:** 11/11 passing (100%)
**Action:** Quick verification only

---

## 📋 Test-Controller Mismatches (Priority 1)

These are **not** field name issues - these are API contract mismatches between tests and controllers.

### Issue A: Cost Calculator API Mismatch
**Test File:** `costCalculator.test.js`
**Issue:** Tests expect old `createUserProgress` API that may not exist
**Evidence:** Some tests still failing despite field migration
**Action Required:**
1. Read `costCalculator.test.js` lines with failing tests
2. Compare expected API contract vs actual controller implementation
3. Either fix controller OR fix tests (whichever matches actual requirements)

### Issue B: Compare Scenarios Endpoint
**Endpoint:** `/api/cost-calculator/compare`
**Status:** Unknown - needs investigation
**Action:** Test manually or check test output

### Issue C: History Endpoint Response Structure
**Endpoint:** `/api/cost-calculator/history/:customerId`
**Issue:** Response structure may not match test expectations
**Action:** Compare test expectations vs controller response format

---

## 🎯 Path to 90% (140/157 tests)

**Current:** 99/157 (63%)
**Needed:** +41 tests
**Estimated time:** 2-3 hours

### Quick Wins (30 minutes)
1. ✅ Fix webhookController.js (10 min)
2. ✅ Verify customerController.js (5 min)
3. ⏭️ Investigate cost calculator test failures (15 min)

### Medium Effort (1-2 hours)
4. Fix cost calculator API mismatches
5. Fix business case remaining issues (4 tests still failing)
6. Fix export controller remaining issues (7 tests still failing)

### Harder Issues (1 hour)
7. Validation schema mismatches
8. Test infrastructure issues
9. Edge cases

---

## 📊 Test Status by Suite

| Suite | Current | Target | Gap | Priority |
|-------|---------|--------|-----|----------|
| costCalculator.test.js | 11/15 (73%) | 14/15 (93%) | +3 | HIGH |
| businessCase.test.js | 14/18 (78%) | 17/18 (94%) | +3 | HIGH |
| export.test.js | 14/21 (67%) | 19/21 (90%) | +5 | HIGH |
| validation.test.js | 24/55 (44%) | 45/55 (82%) | +21 | MEDIUM |
| auth.test.js | 16/22 (73%) | 20/22 (91%) | +4 | MEDIUM |

**Focus on:** Cost calculator, business case, export (these are HIGH value features)

---

## ✅ Immediate Next Steps

1. **Fix webhookController.js** (10 min)
   - 6 find-and-replace operations
   - No tests to verify (manual check)

2. **Quick verify customerController.js** (5 min)
   - Already 100% passing
   - Just confirm field names are correct

3. **Run full test suite** (2 min)
   - See if webhook fixes help other tests
   - Document new baseline

4. **Investigate cost calculator failures** (15 min)
   - Read test file
   - Compare API contracts
   - Identify mismatches

5. **Report progress to Agent 1**
   - Test count
   - Remaining blockers
   - Time estimate to 90%

---

**Next Owner:** Agent 2
**Time Estimate:** 2-3 hours to reach 90% test pass rate
**Blockers:** None - clear path forward
