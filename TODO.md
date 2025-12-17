# 📋 Project Todo Tasks

> Last Updated: December 17, 2025

---

## 🔴 Critical Priority

- [ ] **Split PaymentDialog.tsx** - Refactor 2000-line file into smaller components
  - OrderConfirmation.tsx
  - CustomerDetailsForm.tsx
  - PaymentMethodSelector.tsx
  - BillPrinter.tsx
  - OrderEditor.tsx

- [ ] **Add inventory deduction** - Reduce stock when orders are completed

- [ ] **Add transaction logging** - Record all payments to `transactions` table

- [ ] **Fix column name inconsistency** - Standardize `Customer_Name` vs `customer_name`

---

## 🟠 High Priority

- [ ] **Enable mobile navigation** - Uncomment line 28 in `POS.tsx`

- [ ] **Add UPI payment verification** - Verify payment status before marking complete

- [ ] **Make tax rate configurable** - Move from hardcoded 5% to restaurant settings

- [ ] **Add loading states** - Show processing feedback in payment flow

---

## 🟡 Medium Priority

- [ ] **Centralize restaurant context** - Create `useRestaurantContext` hook

- [ ] **Replace window.confirm()** - Use UI modals instead of native dialogs

- [ ] **Improve empty states** - Better guidance for empty menu categories

- [ ] **Increase menu thumbnails** - Larger images (currently 80x80px)

---

## 🟢 Future Enhancements

- [ ] **Offline mode** - Auto-save orders locally for network resilience

- [ ] **Barcode scanning** - Quick item lookup via SKU/barcode

- [ ] **Split billing** - Divide orders for group payments

- [ ] **Item modifiers** - Extra toppings, custom notes per item

---

## ✅ Completed

### Security & Compliance Fixes (Dec 17, 2025)
- [x] Fix GDPR shared state bug - separate form states for each card
- [x] Replace window.confirm() with custom UI confirmation dialogs
- [x] Add pagination to Audit Trail (20 items per page)
- [x] Connect dashboard metrics to real database data
- [x] Modernize all Security components with glassmorphism
- [x] Add email validation for GDPR requests
- [x] Improve JSON diff display in Audit Trail

### Recipe Management Modernization (Dec 17, 2025)
- [x] Modernize RecipeDialog.tsx with glassmorphism
- [x] Modernize RecipeList.tsx with gradient badges
- [x] Enhance RecipeManagement.tsx stat cards
- [x] Enhance RecipeCostingCard.tsx metrics
- [x] Fix input fields not working in RecipeDialog
- [x] Add unit conversion logic for ingredients (g→kg, ml→l)
- [x] Fix batch production buttons with dialog

---

## Notes

Add new tasks by editing this file. Use checkbox format:
```markdown
- [ ] Task description
- [x] Completed task
```
