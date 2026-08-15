# ANDROID_APK_TESTING_CHECKLIST

🧪 **Android APK — UI Manual Testing Checklist**

**Project:** Tasty Bite Harbor (Swadeshi Solutions)  
**Date:** 2026-08-15  
**Tester Name:** ___________________  
**Device / Android Version:** ___________________  
**Environment URL:** ___________________  

**Instructions for Testers:** Mark each item: ✅ Pass | ❌ Fail | ⏭️ Skipped. If ❌ Fail — write the issue in the "Notes" column. Take screenshot for every failure. Test on physical Android device (not just emulator).

## SECTION A: Installation & Setup (App Lifecycle)

**Login as:** N/A (Pre-login)  
**Purpose:** Verify the app installs and gets required permissions properly.

| # | What to Test | Steps | Expected Result | Status | Notes | Ref Notes |
|---|---|---|---|---|---|---|
| A1 | APK Installation | Install APK on device | Installs without parsing error | | | |
| A2 | App Launch | Open app from home screen | Splash screen shows, then login | | | |
| A3 | Camera Permission | Trigger QR scanner (POS/Inventory) | Prompts for camera permission, accepts | | | |
| A4 | Storage Permission | Trigger file upload/download | Prompts for storage, accepts | | | |
| A5 | Notification Perms | Launch app on Android 13+ | Prompts for push notifications | | | |
| A6 | Hardware Back Button | Press physical/nav back button | Navigates back one screen, doesn't close app unexpectedly | | | |
| A7 | App Backgrounding | Send app to background, reopen | Resumes state without crashing | | | |

## SECTION B: Authentication & Offline Mode

**Login as:** Any existing user  
**Purpose:** Ensure login works and offline caching functions correctly.

| # | What to Test | Steps | Expected Result | Status | Notes | Ref Notes |
|---|---|---|---|---|---|---|
| B1 | Login | Enter credentials → Login | Navigates to Dashboard | | | |
| B2 | Token Refresh | Leave app open for >1 hr, do action | Action succeeds (token auto-refreshed) | | | |
| B3 | Offline Detection | Turn off WiFi/Data | App shows "Offline" indicator toast/banner | | | |
| B4 | Offline Cached Data | Open app without internet | Cached dashboard/POS data loads | | | |
| B5 | Logout | Go to profile/settings → Logout | Returns to login screen, clears session | | | |

## SECTION C: Point of Sale (POS) & Ordering

**Login as:** Admin/Manager/Staff  
**Purpose:** Core ordering functionalities work properly.

| # | What to Test | Steps | Expected Result | Status | Notes | Ref Notes |
|---|---|---|---|---|---|---|
| C1 | Standard POS Load | Navigate to POS | Menu items, categories, cart render properly | | | |
| C2 | QSR POS Load | Navigate to QSR POS | Fast-billing interface renders | | | |
| C3 | QuickServe POS Load | Navigate to QuickServe POS | Layout adapts to device screen | | | |
| C4 | Add/Remove Items | Tap items to add to cart, swipe to remove | Cart updates price dynamically | | | |
| C5 | Apply Discount | Tap discount → Apply % or flat | Total price recalculates correctly | | | |
| C6 | Checkout / Payment | Complete order → select Cash/UPI | Order succeeds, receipt displays | | | |
| C7 | Bluetooth Print | Trigger receipt print | Prints correctly via Android BT | | | |
| C8 | QR Code Scan | Use Android camera to scan QR | Correct table/item loads | | | |
| C9 | NC Orders | Create Non-Chargeable order | Processed as NC, no revenue added | | | |

## SECTION D: Kitchen & Table Management

**Login as:** Admin/Manager/Staff  
**Purpose:** Kitchen updates and table layout function properly.

| # | What to Test | Steps | Expected Result | Status | Notes | Ref Notes |
|---|---|---|---|---|---|---|
| D1 | Kitchen Display (KDS) | Navigate to Kitchen KDS | Active orders show in grid | | | |
| D2 | Status Update | Tap order to mark 'Preparing' / 'Ready' | Status updates, synced to POS | | | |
| D3 | KDS Audio Alerts | New order arrives while in KDS | Notification sound plays (if not muted) | | | |
| D4 | Table Layout | Navigate to Tables | Tables show visually (Red=Occupied, Green=Free) | | | |
| D5 | Table Transfer | Move order from Table A to Table B | Order moved, Table A frees up | | | |

## SECTION E: Menu & Inventory Management

**Login as:** Admin/Manager  
**Purpose:** Backend items and stock sync properly.

| # | What to Test | Steps | Expected Result | Status | Notes | Ref Notes |
|---|---|---|---|---|---|---|
| E1 | Menu View | Navigate to Menu | Categories and items load with images | | | |
| E2 | Edit Menu Item | Tap item → Edit → Save | Changes save, visible on POS immediately | | | |
| E3 | Inventory View | Navigate to Inventory | Stock list loads | | | |
| E4 | Stock Adjust | Tap stock item → Adjust count → Save | Stock count updates | | | |
| E5 | Supplier Add | Navigate to Suppliers → Add new | Supplier saved successfully | | | |
| E6 | Recipes View | Navigate to Recipes | Ingredients/formulas load correctly | | | |

## SECTION F: Hotel / Guest Services (If enabled)

**Login as:** Admin/Manager  
**Purpose:** Hotel and room management flows.

| # | What to Test | Steps | Expected Result | Status | Notes | Ref Notes |
|---|---|---|---|---|---|---|
| F1 | Room Board | Navigate to Rooms board | Room status (Occupied, Cleaning, Available) | | | |
| F2 | Check-in | Select Room → Check-in guest | Status changes, guest details saved | | | |
| F3 | Room Service | Add POS order to Room Bill | Order linked to room folio | | | |
| F4 | Check-out/Folio | Settle room bill → Checkout | Folio generated, room marked for cleaning | | | |

## SECTION G: Management, BI & CRM

**Login as:** Admin/Owner  
**Purpose:** Dashboards, analytics, and CRM features.

| # | What to Test | Steps | Expected Result | Status | Notes | Ref Notes |
|---|---|---|---|---|---|---|
| G1 | Dashboard Charts | View Dashboard on Mobile | Charts render correctly, responsive | | | |
| G2 | Staff Management | Navigate to Staff → View/Edit | Staff list loads, edits save | | | |
| G3 | Customer CRM | Navigate to Customers | List loads, search bar works | | | |
| G4 | P&L / Reports | Open Reports → View P&L | Data table scrolls horizontally if needed | | | |
| G5 | Export PDF/Excel | Click export on any report | File downloads to Android 'Downloads' folder | | | |

## SECTION H: Franchise Mode (Cross-Branch)

**Login as:** Franchise owner  
**Purpose:** Multi-branch features test on mobile.

| # | What to Test | Steps | Expected Result | Status | Notes | Ref Notes |
|---|---|---|---|---|---|---|
| H1 | Franchise Switcher | Tap branch switcher at top | Dropdown opens, allows changing branches | | | |
| H2 | Franchise Dashboard | View Franchise | Cross-branch KPIs load | | | |
| H3 | Menu Sync | Push menu update to branches | Toast confirms sync | | | |

## SECTION I: App Updates & Push Notifications

**Login as:** Any  
**Purpose:** Verify native push capabilities.

| # | What to Test | Steps | Expected Result | Status | Notes | Ref Notes |
|---|---|---|---|---|---|---|
| I1 | Push Notification | Send test push via FCM | Notification appears in Android system tray | | | |
| I2 | Notification Tap | Tap notification | App opens, routes to correct screen | | | |
| I3 | In-App Update | Trigger SW update / Refresh | Shows "Update Available" banner, reloads | | | |
