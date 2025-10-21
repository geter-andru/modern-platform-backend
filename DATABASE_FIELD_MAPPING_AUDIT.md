# Database Field Mapping Audit
**Platform:** H&S Revenue Intelligence Platform
**Migration:** Airtable (PascalCase with spaces) → Supabase (snake_case)
**Date:** October 21, 2025
**Auditor:** Agent 1 (DevOps + Testing Lead)

---

## 🎯 Audit Objective

Systematically identify and document **all** field name mismatches between controllers (using old Airtable PascalCase format) and Supabase database (using snake_case format).

This audit supports Agent 2's controller bug fixes (BUG-002 through BUG-007).

---

## 📊 Complete Field Mapping Table

### Customer Table Fields

| Airtable Field (OLD) | Supabase Field (NEW) | Status | Files Affected |
|---------------------|---------------------|--------|----------------|
| `'Customer ID'` | `customer_id` | ✅ Migrated | All controllers |
| `'Customer Name'` | `customer_name` | ✅ Migrated | All controllers |
| `'ICP Content'` | `icp_content` | ⚠️ **PARTIAL** | webhookController.js:98, customerController.js:195 |
| `'Cost Calculator Content'` | `cost_calculator_content` | ⚠️ **PARTIAL** | webhookController.js:144, costCalculatorController.js |
| `'Business Case Content'` | `business_case_content` | ⚠️ **PARTIAL** | webhookController.js:190, businessCaseController.js:260,310 |
| `'Content Status'` | `content_status` | ⚠️ **PARTIAL** | webhookController.js:99,145,191, customerController.js:196 |
| `'Last Accessed'` | `last_accessed` | ⚠️ **PARTIAL** | costCalculatorController.js |
| `'Progress Data'` | `progress_data` | ❓ Unknown | progressController.js |
| `'Tool Name'` | `tool_name` | ❓ Unknown | progressController.js |
| `'Updated At'` | `updated_at` | ❓ Unknown | Multiple controllers |

---

## 🔍 Detailed Findings by Controller

### 1. costCalculatorController.js
**Status:** ❌ **NEEDS FIXING**
**Priority:** CRITICAL (blocking BUG-002)

**PascalCase Field References:**
- Line 97: `'Cost Calculator Content': JSON.stringify(result)`
- Line 98: `'Content Status': 'Ready'`
- Line 99: `'Last Accessed': new Date().toISOString()`
- Line 181: `'Cost Calculator Content': JSON.stringify({...})`
- Line 189: `'Customer ID': customerId`
- Line 190: `'Tool Name': 'Cost Calculator'`
- Line 191: `'Progress Data': JSON.stringify(calculations)`
- Line 192: `'Updated At': new Date().toISOString()`
- Line 380: `'Cost Calculator Content': JSON.stringify(costData)`
- Line 381: `'Content Status': 'Ready'`
- Line 382: `'Last Accessed': new Date().toISOString()`

**Required Changes:**
```javascript
// OLD (Airtable format)
'Cost Calculator Content' → cost_calculator_content
'Content Status' → content_status
'Last Accessed' → last_accessed
'Customer ID' → customer_id
'Tool Name' → tool_name
'Progress Data' → progress_data
'Updated At' → updated_at
```

---

### 2. businessCaseController.js
**Status:** ❌ **NEEDS FIXING**
**Priority:** HIGH (blocking BUG-003)

**PascalCase Field References:**
- Line 260: `'Business Case Content': JSON.stringify(businessCases)`
- Line 310: `'Business Case Content': JSON.stringify(businessCases)`

**Required Changes:**
```javascript
'Business Case Content' → business_case_content
'Content Status' → content_status (if present)
'Last Accessed' → last_accessed (if present)
```

---

### 3. webhookController.js
**Status:** ❌ **NEEDS FIXING**
**Priority:** HIGH (blocking BUG-005)

**PascalCase Field References:**
- Line 98: `'ICP Content': JSON.stringify(icpData)`
- Line 99: `'Content Status': 'Ready'`
- Line 144: `'Cost Calculator Content': JSON.stringify(costData)`
- Line 145: `'Content Status': 'Ready'`
- Line 190: `'Business Case Content': JSON.stringify(businessCaseData)`
- Line 191: `'Content Status': 'Ready'`

**Required Changes:**
```javascript
'ICP Content' → icp_content
'Cost Calculator Content' → cost_calculator_content
'Business Case Content' → business_case_content
'Content Status' → content_status (3 occurrences)
```

---

### 4. customerController.js
**Status:** ❌ **NEEDS FIXING**
**Priority:** MEDIUM

**PascalCase Field References:**
- Line 195: `'ICP Content': JSON.stringify(icpContent)`
- Line 196: `'Content Status': 'Ready'`

**Required Changes:**
```javascript
'ICP Content' → icp_content
'Content Status' → content_status
```

---

### 5. exportController.js
**Status:** ❓ **NEEDS INVESTIGATION**
**Priority:** MEDIUM (blocking BUG-004)

**Action Required:**
- Read file and search for PascalCase field names
- Likely uses same content fields for export generation
- May read from: `'Business Case Content'`, `'ICP Content'`, `'Cost Calculator Content'`

---

### 6. progressController.js
**Status:** ❓ **NEEDS INVESTIGATION**
**Priority:** LOW

**Action Required:**
- Read file and search for progress-related field names
- May use: `'Progress Data'`, `'Tool Name'`, `'Updated At'`

---

### 7. icpFrameworkController.js
**Status:** ❓ **NEEDS INVESTIGATION**
**Priority:** MEDIUM

**Action Required:**
- Read file and search for ICP-related field names
- Likely uses: `'ICP Content'`, `'Content Status'`

---

## 🧪 Verification Strategy

For each controller fix, verify with corresponding test file:

| Controller | Test File | Expected Improvement |
|-----------|-----------|---------------------|
| costCalculatorController.js | costCalculator.test.js | 4/15 → 13-14/15 |
| businessCaseController.js | businessCase.test.js | 11/18 → 16-17/18 |
| webhookController.js | (manual testing) | N/A |
| customerController.js | customer.test.js | Already 100% |
| exportController.js | export.test.js | 15/21 → 19-20/21 |
| progressController.js | (no tests) | N/A |
| icpFrameworkController.js | (no dedicated tests) | N/A |

---

## ✅ Migration Checklist

### Phase 1: Immediate Fixes (Agent 2 - Current)
- [ ] costCalculatorController.js - All 11 field references
- [ ] businessCaseController.js - 2 field references
- [ ] webhookController.js - 6 field references
- [ ] customerController.js - 2 field references

### Phase 2: Investigation & Fixes (Agent 1 - Next)
- [ ] Read exportController.js - identify field references
- [ ] Read progressController.js - identify field references
- [ ] Read icpFrameworkController.js - identify field references
- [ ] Fix any PascalCase references found

### Phase 3: Validation
- [ ] Run full test suite
- [ ] Verify 80%+ pass rate achieved
- [ ] Document any remaining field mapping issues
- [ ] Update this audit with findings

---

## 🎯 Success Criteria

**Before Migration:**
- Tests: 95/157 passing (60.5%)
- Controllers using mixed PascalCase/snake_case
- Database queries failing due to field mismatches

**After Migration:**
- Tests: 135-140/157 passing (85-90%)
- All controllers using consistent snake_case
- All database queries succeed
- No PascalCase field names in controllers

---

## 📝 Notes for Agent 2

### Confirmed Pattern
All `supabaseDataService.updateCustomer()` calls should use snake_case:

```javascript
// ❌ WRONG (Old Airtable format)
await supabaseDataService.updateCustomer(customerId, {
  'Cost Calculator Content': JSON.stringify(data),
  'Content Status': 'Ready',
  'Last Accessed': new Date().toISOString()
});

// ✅ CORRECT (New Supabase format)
await supabaseDataService.updateCustomer(customerId, {
  cost_calculator_content: JSON.stringify(data),
  content_status: 'Ready',
  last_accessed: new Date().toISOString()
});
```

### Why This Matters
1. **Database Schema:** Supabase tables use snake_case columns
2. **Service Layer:** supabaseDataService expects snake_case keys
3. **Test Expectations:** All tests mock snake_case responses
4. **API Responses:** Frontend expects snake_case in JSON responses

### Search Pattern to Find Issues
```bash
grep -r "'\[A-Z\]\[a-zA-Z \]* \(Content\|Status\|ID\|Name\|Data\)'" src/controllers/
```

---

**Status:** READY FOR AGENT 2 TO USE
**Next Action:** Agent 2 to systematically fix all PascalCase references
**Estimated Impact:** +35-45 passing tests (60% → 85-90%)
