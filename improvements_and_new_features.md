# Money — Improvements & New Features

> Mobile-first roadmap. This app is used primarily on a phone (installed PWA), so every item below is
> prioritised around touch input, small screens, offline behaviour, and daily-use convenience.

**Status legend:** ✅ Done · 🔄 In progress · ⬜ Not started
**Last updated:** 15 November 2026

---

## 1. Fix first: PWA bugs that hurt installed mobile use

**Progress: 5 of 8 done.**

These are small fixes with outsized impact, because the app is consumed as an installed PWA.

| Status | Issue | Where | Impact |
| --- | --- | --- | --- |
| ✅ | `index.html` linked `/site.webmanifest`, whose `name` and `short_name` were **empty strings** | `index.html`, `public/site.webmanifest` | Fixed. The stale duplicate manifest was deleted and the app now uses only the generated manifest, so the installed app shows "Money Manager" / "Money" instead of a blank name. |
| ✅ | Manifest referenced `pwa-192x192.png`, `pwa-512x512.png`, `masked-icon.svg` — **none of these exist** | `vite.config.js` | Fixed. The manifest now points at the real `android-chrome-192x192.png` / `android-chrome-512x512.png` assets, with a maskable entry added. No more 404s during install. |
| ✅ | No full-screen viewport handling, no safe-area insets | `index.html`, `FixedSaveButton.vue`, `FloatingActionButton.vue`, `PageLayout.vue`, `PageHeader.vue` | Fixed. The viewport opts into the full screen and the fixed save bar, FAB, page padding and sticky header all respect the notch and home indicator. |
| ✅ | No `theme-color`, no `apple-mobile-web-app-*` metas | `index.html` | Fixed. iOS standalone metas added, and the browser chrome colour now follows the active theme (light or dark) instead of staying white. |
| ✅ | `registerType: 'prompt'` with **no update UI** | `vite.config.js`, `App.vue` | Fixed. A "new version available" prompt with Reload / Later now appears when a fresh build is deployed, and the app checks for updates hourly while open. |
| ⬜ | No online/offline indicator and no request queue | `App.vue`, `syncStore.js` | Image uploads silently fail offline even though the docs claim offline queuing. |
| ⬜ | Raw HTML rendering of the transaction description | `book-details/TransactionCard.vue` | Script injection risk from user-entered content. |
| ⬜ | PIN and API token stored in plaintext in Dexie `settings` | `store/settingsStore.js` | On a phone, local data is the whole threat model. No PIN rate limiting either. |

---

## 2. Mobile UX upgrades to existing features

**Progress: 10 of 21 done.**

### Entry flow — highest value, this is used daily

- ✅ `BaseInput.vue` now supports `inputmode`, `autocomplete` and `enterkeyhint`, and derives the right
  keyboard automatically — numeric fields open the decimal keypad, phone fields the telephone keypad,
  and the final field of a group reads "Done".
- ✅ Replaced the blocking browser alert and confirm dialogs in `transaction-form/index.vue` with an
  in-app toast and a reusable bottom-sheet confirmation.
- ✅ Added an **unsaved-changes guard** before leaving the form — a back-swipe or header back now asks
  before discarding, and a refresh triggers the browser's leave warning.
- ✅ **Quick entry**: the amount is now the first field and stays editable when no items are added, so a
  transaction can be recorded in three taps. New entries reuse the previous transaction's categories,
  payment mode and contact, and the products section is collapsed by default.
- ✅ **Camera capture for receipts** — a "Take photo" button opens the native camera and uploads straight
  into the existing attachment flow.
- ✅ Quantity, rate and amount fields now open the decimal keypad with Next / Done keys instead of the
  full keyboard, which removes the need for a custom keypad sheet.

### Transaction list — `book-details/index.vue`

- ⬜ Swipe left = delete, swipe right = edit / duplicate (additive to the existing long-press action sheet).
- ⬜ **Undo snackbar** after delete instead of the current irreversible flow.
- ⬜ Bulk-select mode for multi-delete / multi-move.
- ⬜ Sticky month headers plus a jump-to-month scrubber.
- ⬜ Pull-to-refresh that triggers a sync.
- ⬜ Attachment viewer directly from the card (currently attachments aren't tappable).

### Navigation and chrome

- ✅ **Bottom tab bar** — Home, Transactions, Charts and Settings are one tap away. Transactions and
  Charts reopen the last-used book, the bar hides itself on drill-down screens and while the app is
  locked, and tab pages reserve enough bottom space that the bar never covers content.
- ⬜ Pull-to-refresh, haptic feedback on save/delete, and scroll-position restoration on back.
- ⬜ **Global search** across transactions, contacts and products from the dashboard.

### Dashboard — `dashboard/index.vue`, `BookCard.vue`

- ✅ Book cards now show the running **balance, this-month spend, and a seven-day spending sparkline**.
- ✅ Cross-book **"This month" summary card** with the combined balance plus this month's in and out.
- ✅ Quick-add FAB that **remembers the last-used book**, so a repeat entry never asks for a book again.
  Book creation moved to a "+" action in the header.

### Formatting and locale

- ⬜ `formatCurrency` hardcodes the Indian locale and renders **no currency symbol**; date helpers hardcode
  the US locale. Add a settings-driven locale/currency (NPR/INR).
- ⬜ `getNepalDate` is currently a stub that just returns the current date.
- ⬜ Optional Bikram Sambat (BS) date display if that's the target context.

---

## 3. New mobile-first features

**Progress: 0 of 17 done.**

### Habit-forming (drives daily use)

- ⬜ **Recurring transactions** — rent, salary, subscriptions, with a "due today" prompt on app open.
- ⬜ **Budgets per category** with a progress ring on the dashboard and warnings at 80% / 100%.
- ⬜ **Savings goals** with contribution tracking.
- ⬜ **Transaction templates / favourites** — one tap to re-add a regular expense.
- ⬜ A "Today" summary card pinned to the top of the dashboard.

### Money-tracking gaps

- ⬜ **Contact ledger** — per-person payable/receivable balance ("Ramesh owes you 2,500"). The contact
  field already makes this data available.
- ⬜ **Payment-mode reconciliation** — opening/closing balance per cash/wallet account.
- ⬜ **Soft delete + Trash** so deletes are recoverable.
- ⬜ **CSV / PDF export** and share-sheet export (currently JSON-only via `DatabaseBackup.vue`).
- ⬜ **Receipt OCR** to prefill amount, date and merchant.
- ⬜ **Multi-currency** for travel books.

### Charts — `book-charts/`

- ⬜ Cash-flow (income vs expense over time), net-worth trend, and category donut/breakdown.
  The current set is mostly month/year line and bar charts.
- ⬜ Touch-friendly tooltips and larger hit targets.

### PWA-native extras

- ⬜ Manifest `shortcuts` ("Add expense", "Add income"), `share_target` (share a receipt image into the app),
  and `screenshots` for a richer install prompt.
- ⬜ Custom **install prompt** with iOS "Add to Home Screen" instructions.
- ⬜ App badge with today's transaction count.
- ⬜ Optional push/reminder notifications.

---

## 4. Performance and data layer

**Progress: 0 of 4 done.**

- ⬜ `store/transactionStore.js` loads **every transaction for the book** into memory and filters client-side.
  Move to Dexie range queries plus pagination — the load-more UI already exists. This matters most on
  mid-range phones.
- ⬜ `store/syncStore.js` is **push-only full-DB**, and `sync_status` is written but never cleared. Add
  pull/merge, per-record dirty flags, retry with backoff, and Background Sync.
- ⬜ `composables/useDatabaseExport.js` import is full-replace with no preview or validation. Add a
  merge-vs-replace choice and a diff summary.
- ⬜ The image upload component is a ~232 KB chunk. Compress before upload and lazy-load it only on the form.

---

## Suggested order

1. ✅ **PWA correctness** — manifest and icons, safe-area, theme-color, update prompt. *(Done 15 Nov 2026.)*
2. ✅ **Entry flow polish** — inputmode, unsaved guard, non-blocking dialogs. *(Done 15 Nov 2026.)*
3. ✅ **Bottom navigation + dashboard balances.** *(Done 15 Nov 2026.)*
4. ⬜ **Recurring transactions + budgets** — the features most likely to make the app open daily.
5. ⬜ **Contact ledger + CSV export.**
6. ⬜ **Sync rewrite + transaction pagination** — do this before the dataset grows.

---

## Implementation log

### 15 November 2026 — PWA correctness (phase 1)

Shipped the install and display fixes from Section 1:

- Replaced the stale, empty duplicate web manifest with the single generated one, so the installed app
  carries a proper name, description, start URL and language.
- Corrected the manifest icon set to the assets that actually exist and added a maskable variant, removing
  the 404s that blocked clean installation.
- Opted the viewport into the full screen and applied safe-area insets to the fixed save bar, the floating
  action button, the page layout and the sticky header.
- Added iOS standalone metadata and made the browser chrome colour track the active theme.
- Added a service-worker update prompt with Reload / Later, plus a periodic background check for new
  deployments.

Verified with a production build: the service worker registers and activates at the app scope, the update
prompt appears when a new build is available, and choosing Reload activates the new worker and clears the
prompt. All routes load without console errors.

**Still open in Section 1:** offline indicator and upload queue, sanitising the transaction description,
and hardening PIN / API-token storage.

### 15 November 2026 — Entry flow polish (phase 2)

Shipped the entry-flow items from Section 2:

- The shared input component now understands mobile keyboard hints and picks a sensible keyboard from the
  field type, so amounts, quantities and rates open the decimal keypad and the last field shows "Done".
- Blocking browser alerts and confirmations were replaced with an in-app toast and a reusable
  bottom-sheet confirmation, used for validation errors, failed saves and image removal.
- Leaving the form with unsaved work now asks first, both for in-app navigation and for a page refresh.
- Quick entry was reworked: the amount is the first and most prominent field, it stays editable when no
  line items are added, new entries prefill the previous transaction's categories, payment mode and
  contact, and the products section starts collapsed.
- A "Take photo" button was added to the image uploader so a receipt can be captured with the camera and
  uploaded in one step.

Verified against a production build: the amount-only path saves correctly, the previous transaction's
categories and payment mode are preselected, the discard prompt appears on back and cancelling it keeps
you on the form, and validation errors surface as a toast without leaving the form.

**Still open in Section 2:** the transaction-list items, including swipe actions, undo delete, bulk select,
sticky month headers, pull-to-refresh and the attachment viewer; pull-to-refresh / haptics / scroll
restoration; global search; and locale-aware currency formatting.

### 15 November 2026 — Bottom navigation and dashboard balances (phase 3)

Shipped the navigation and dashboard items from Section 2:

- Added a fixed **bottom tab bar** with Home, Transactions, Charts and Settings. It appears only on those
  four screens, hides while the app is locked, marks the active tab, and every tab page now reserves
  enough bottom space that the bar never covers the last row of content.
- Transactions and Charts **remember the last book** that was opened, so those tabs reopen the right book
  instead of dumping the user back on the dashboard. The shortcut is cleared when that book is deleted.
- The dashboard now opens with a **combined balance card** showing the total across all books plus this
  month's money in and out.
- **Book cards** show the running balance, this month's spend, and a seven-day spending sparkline, so the
  state of each book is visible without opening it.
- The dashboard **quick-add button now records a transaction** in the last-used book (falling back to the
  first book), and book creation moved to a "+" action in the header.

Verified against a production build with seeded data: totals, per-book balances and sparkline shapes match
the underlying transactions, the nav highlights the right tab on each screen, it disappears on the entry
form, the quick-add button targets the remembered book after visiting a different book, the raised button
clears the nav, and deleting the remembered book clears the stored shortcut.
