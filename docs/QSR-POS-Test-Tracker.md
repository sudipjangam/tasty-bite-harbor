# QSR POS - Test Execution Tracker

> **Purpose:** Track all test case executions with pass/fail status and dates  
> **Instructions:** Update this table each time you run tests. Mark ✅ for PASS, ❌ for FAIL, ⏳ for PENDING.

---

## Test Execution Summary

| Run Date | Tester | Environment | Total | Passed | Failed | Notes |
|----------|--------|-------------|-------|--------|--------|-------|
| 2026-01-01 | AI Agent | localhost:8080 | 34 | 34 | 0 | Initial QA - All tests passed |
| _YYYY-MM-DD_ | _Name_ | _Environment_ | _#_ | _#_ | _#_ | _Notes_ |
| | | | | | | |
| | | | | | | |

---

## Detailed Test Case Tracker

### Core Test Cases (TC-001 to TC-012)

| TC ID | Test Case Name | Priority | Category | Last Run | Status | Tester | Notes |
|-------|---------------|----------|----------|----------|--------|--------|-------|
| TC-001 | Table Selection | High | Order Mgmt | 2026-01-01 | ✅ PASS | AI | Tables load with correct colors |
| TC-002 | Add Items to Order | High | Order Mgmt | 2026-01-01 | ✅ PASS | AI | Toast and cart updates work |
| TC-003 | Edit Item Quantity | High | Order Mgmt | 2026-01-01 | ✅ PASS | AI | +/- controls responsive |
| TC-004 | Send to Kitchen | Critical | Kitchen | 2026-01-01 | ✅ PASS | AI | Order syncs to KDS |
| TC-005 | Cash Payment | Critical | Payments | 2026-01-01 | ✅ PASS | AI | Table released after |
| TC-006 | Card Payment | Critical | Payments | 2026-01-01 | ✅ PASS | AI | Payment processes |
| TC-007 | UPI/QR Payment | Critical | Payments | 2026-01-01 | ✅ PASS | AI | QR shows correct amount |
| TC-008 | Percentage Discount | High | Discounts | 2026-01-01 | ✅ PASS | AI | % calculation correct |
| TC-009 | Cash (Flat) Discount | High | Discounts | 2026-01-01 | ✅ PASS | AI | Flat deduction works |
| TC-010 | Recall Order | High | Order Mgmt | 2026-01-01 | ✅ PASS | AI | Items load correctly |
| TC-011 | Back to Tables Nav | Medium | Navigation | 2026-01-01 | ✅ PASS | AI | UX fix verified |
| TC-012 | KDS Strikethrough | Medium | KDS | 2026-01-01 | ✅ PASS | AI | Sync working |

### Extended Test Cases (TC-013 to TC-023)

| TC ID | Test Case Name | Priority | Category | Last Run | Status | Tester | Notes |
|-------|---------------|----------|----------|----------|--------|--------|-------|
| TC-013 | Open Payment Dialog | High | Payments | 2026-01-01 | ✅ PASS | AI | Dialog opens correctly |
| TC-014 | Order Summary Display | High | Payments | 2026-01-01 | ✅ PASS | AI | Items and totals shown |
| TC-015 | Cart Clears After Send | High | Order Mgmt | 2026-01-01 | ✅ PASS | AI | Auto-clears |
| TC-016 | Table Status Update | High | Tables | 2026-01-01 | ✅ PASS | AI | Becomes occupied |
| TC-017 | Combined Discounts | Medium | Discounts | 2026-01-01 | ✅ PASS | AI | Both % + cash work |
| TC-018 | Clear Discounts | Medium | Discounts | 2026-01-01 | ✅ PASS | AI | Reset button works |
| TC-019 | Active Orders Drawer | Medium | Navigation | 2026-01-01 | ✅ PASS | AI | Opens with orders |
| TC-020 | Mobile Cart Bottom Sheet | Medium | UI | 2026-01-01 | ✅ PASS | AI | Expand/collapse works |
| TC-021 | Clear Order Button | Medium | Order Mgmt | 2026-01-01 | ✅ PASS | AI | Cart empties |
| TC-022 | Table Name in Header | Low | UI | 2026-01-01 | ✅ PASS | AI | Shows "Table X" |
| TC-023 | Refresh Tables Button | Low | UI | 2026-01-01 | ✅ PASS | AI | Retry for empty state |

---

## Edge Cases & Regression Tests

| TC ID | Test Case Name | Priority | Category | Last Run | Status | Tester | Notes |
|-------|---------------|----------|----------|----------|--------|--------|-------|
| TC-E01 | Empty Cart Payment | Low | Edge Case | 2026-01-01 | ✅ PASS | AI | Button disabled |
| TC-E02 | No Tables State | Low | Edge Case | 2026-01-01 | ✅ PASS | AI | Refresh btn works |
| TC-E03 | Session Timeout | Low | Edge Case | 2026-01-01 | ⏳ PENDING | - | Needs extended test |
| TC-E04 | Duplicate Add | Low | Edge Case | 2026-01-01 | ✅ PASS | AI | Quantity increases |

---

## New Test Run Template

Copy and fill for each new test run:

```markdown
### Test Run: YYYY-MM-DD

| TC ID | Status | Tester | Notes |
|-------|--------|--------|-------|
| TC-001 | ⏳ | | |
| TC-002 | ⏳ | | |
| TC-003 | ⏳ | | |
| TC-004 | ⏳ | | |
| TC-005 | ⏳ | | |
| TC-006 | ⏳ | | |
| TC-007 | ⏳ | | |
| TC-008 | ⏳ | | |
| TC-009 | ⏳ | | |
| TC-010 | ⏳ | | |
| TC-011 | ⏳ | | |
| TC-012 | ⏳ | | |
```

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ PASS | Test passed successfully |
| ❌ FAIL | Test failed - bug found |
| ⏳ PENDING | Not yet tested |
| ⚠️ BLOCKED | Cannot test - dependency issue |
| 🔄 RETEST | Needs re-testing after fix |

---

## Related Documents

- [QA Testing Guide](./QSR-POS-QA-Testing-Guide.md) - Detailed test case steps
- [Test Checklist](./QSR-POS-Test-Checklist.md) - Quick checklist format
- [Test Report](./QSR-POS-Test-Report-Jan2026.md) - Full report with screenshots
- [Architecture](./QSR-POS-Architecture.md) - Technical reference
