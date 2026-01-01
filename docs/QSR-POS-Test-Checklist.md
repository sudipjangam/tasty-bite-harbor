# QSR POS - Test Execution Checklist

> **Purpose:** Quick checklist for testers to verify QSR POS functionality  
> **Time Required:** ~30 minutes for full test  
> **Last Verified:** January 2026

---

## Pre-Test Setup ⚙️

| Step | Action | ✓ |
|------|--------|---|
| 1 | Start dev server: `npm run dev` | ☐ |
| 2 | Open browser to `http://localhost:8080` | ☐ |
| 3 | Login with test credentials | ☐ |
| 4 | Verify at least 1 table exists (check `/tables`) | ☐ |
| 5 | Verify menu items exist (check `/menu`) | ☐ |

---

## Quick Smoke Test (5 min) 🚀

| # | Test | Expected | ✓ |
|---|------|----------|---|
| 1 | Navigate to `/qsr-pos` | Page loads, tables visible | ☐ |
| 2 | Select a table | Menu appears | ☐ |
| 3 | Add 1 item | Cart shows 1 item | ☐ |
| 4 | Send to Kitchen | Success toast | ☐ |
| 5 | Cash payment | Payment completes | ☐ |

**Smoke Test Result:** ☐ PASS / ☐ FAIL

---

## Full Test Suite 📋

### A. Order Creation

| # | Test | Steps | Expected | ✓ |
|---|------|-------|----------|---|
| A1 | Table Selection | Click available table | Menu view opens | ☐ |
| A2 | Add Item | Click menu item | Toast "Added", cart updates | ☐ |
| A3 | Add Multiple | Click 3 different items | All 3 in cart | ☐ |
| A4 | Increment Qty | Click "+" on item | Quantity +1 | ☐ |
| A5 | Decrement Qty | Click "-" on item | Quantity -1 | ☐ |
| A6 | Remove Item | Decrement to 0 | Item removed | ☐ |
| A7 | Clear Order | Click "Clear" | Cart empty | ☐ |

### B. Order Flow

| # | Test | Steps | Expected | ✓ |
|---|------|-------|----------|---|
| B1 | Send to Kitchen | Items in cart → "Send to Kitchen" | Toast "Sent to Kitchen" | ☐ |
| B2 | Cart Clears | After send | Cart empty | ☐ |
| B3 | Table Occupied | After send | Table turns orange | ☐ |
| B4 | KDS Received | Check `/kitchen` | Order visible | ☐ |

### C. Payments

| # | Test | Steps | Expected | ✓ |
|---|------|-------|----------|---|
| C1 | Open Payment | "Proceed to Payment" | Dialog opens | ☐ |
| C2 | Order Summary | Review step | Items & total correct | ☐ |
| C3 | Cash Payment | Select "Cash" | Payment completes | ☐ |
| C4 | Card Payment | Select "Card" | Payment completes | ☐ |
| C5 | UPI Payment | Select "UPI" | QR code shown | ☐ |
| C6 | Mark as Paid | After UPI QR | Payment completes | ☐ |

### D. Discounts

| # | Test | Steps | Expected | ✓ |
|---|------|-------|----------|---|
| D1 | % Discount | Enter 10 in "Discount (%)" | 10% deducted | ☐ |
| D2 | Cash Discount | Enter 50 in "Cash Discount" | ₹50 deducted | ☐ |
| D3 | Combined | Both discounts | Both applied | ☐ |
| D4 | Clear Discount | Click "Clear" | Both reset to 0 | ☐ |
| D5 | Max Validation | Enter 200% | Should cap or reject | ☐ |

### E. Navigation

| # | Test | Steps | Expected | ✓ |
|---|------|-------|----------|---|
| E1 | Back to Tables | Click back arrow | Table grid shown | ☐ |
| E2 | Table Name | Select table | Header shows "Table X" | ☐ |
| E3 | Active Orders | Click history icon | Drawer opens | ☐ |
| E4 | Recall Order | Click "Recall Order" | Items load to cart | ☐ |

### F. KDS Integration

| # | Test | Steps | Expected | ✓ |
|---|------|-------|----------|---|
| F1 | Order Sync | Send from POS | Appears in KDS | ☐ |
| F2 | Item Complete | Mark item done in KDS | Checkbox stays | ☐ |
| F3 | Strikethrough | Open payment for that order | Item has strikethrough | ☐ |
| F4 | Ready Badge | Check payment dialog | "✓ Ready" badge shown | ☐ |

---

## Edge Cases 🔬

| # | Test | Steps | Expected | ✓ |
|---|------|-------|----------|---|
| E1 | Empty Cart Payment | Try payment with 0 items | Button disabled | ☐ |
| E2 | No Tables | Delete all tables, reload | "No tables" + Refresh btn | ☐ |
| E3 | Session Timeout | Wait 30+ min | Redirects to login | ☐ |
| E4 | Duplicate Add | Add same item twice | Quantity increases | ☐ |

---

## Test Results Summary

| Category | Passed | Failed | Notes |
|----------|--------|--------|-------|
| Order Creation | /7 | | |
| Order Flow | /4 | | |
| Payments | /6 | | |
| Discounts | /5 | | |
| Navigation | /4 | | |
| KDS Integration | /4 | | |
| Edge Cases | /4 | | |
| **TOTAL** | **/34** | | |

---

## Tester Sign-off

| Field | Value |
|-------|-------|
| Tester Name | |
| Date | |
| Environment | localhost:8080 / staging / production |
| Browser | Chrome / Firefox / Safari / Edge |
| Overall Result | ☐ PASS / ☐ FAIL |
| Notes | |
