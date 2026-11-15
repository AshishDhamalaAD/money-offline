# Money — Improvements & New Features

> Mobile-first roadmap. This app is used primarily on a phone (installed PWA), so every item below is
> prioritised around touch input, small screens, offline behaviour, and daily-use convenience.

---

## 1. Fix first: PWA bugs that hurt installed mobile use

These are small fixes with outsized impact, because the app is consumed as an installed PWA.

| Issue | Where | Impact |
| --- | --- | --- |
| `index.html` links `/site.webmanifest`, whose `name` and `short_name` are **empty strings** | `index.html`, `public/site.webmanifest` | Installed app can show a blank name on the Android home screen. It also conflicts with the `manifest.webmanifest` that vite-plugin-pwa generates. |
| Manifest references `pwa-192x192.png`, `pwa-512x512.png`, `masked-icon.svg` — **none of these exist** | `vite.config.js` | 404s during install; no proper or maskable icon. Correctly sized `android-chrome-192x192.png` / `android-chrome-512x512.png` already exist in `public/` — point the manifest at those and remove the stale `site.webmanifest`. |
| No `viewport-fit=cover`, no `env(safe-area-inset-*)` | `index.html`, `FixedSaveButton.vue`, `FloatingActionButton.vue`, `PageLayout.vue` | Save button and FAB sit under the iPhone home indicator / gesture bar. |
| No `theme-color`, no `apple-mobile-web-app-*` metas | `index.html` | iOS standalone mode gets a white status bar and wrong chrome; Android address bar colour doesn't match dark mode. |
| `registerType: 'prompt'` with **no update UI** | `vite.config.js`, `App.vue` | Stale builds persist until a hard reload. Needs a "New version available → Reload" toast. |
| No online/offline indicator and no request queue | `App.vue`, `syncStore.js` | Image uploads silently fail offline even though the docs claim offline queuing. |
| Unsanitised `v-html` for transaction description | `book-details/TransactionCard.vue` | Script injection risk from user-entered content. |
| PIN and API token stored in plaintext in Dexie `settings` | `store/settingsStore.js` | On a phone, local data is the whole threat model. No PIN rate limiting either. |

---

## 2. Mobile UX upgrades to existing features

### Entry flow — highest value, this is used daily

- `BaseInput.vue` has no `inputmode`, `autocomplete`, or `enterkeyhint`. Amount fields should open the
  numeric keypad (`inputmode="decimal"`), phone fields `inputmode="tel"`, and the last field should read "Done".
- Replace blocking `alert()` / `confirm()` in `transaction-form/index.vue` with the existing
  `BaseBottomSheet` / toast components.
- Add an **unsaved-changes guard** (`onBeforeRouteLeave`) — a back-swipe currently loses the whole entry.
- **Quick-entry mode**: amount → category → save in three taps, with "same as last time" defaults.
- **Camera capture for receipts** (`capture="environment"`) feeding the existing ImageUpload component.
- Numeric keypad sheet for `ProductLineItem.vue` quantity/rate instead of the full keyboard.

### Transaction list — `book-details/index.vue`

- Swipe left = delete, swipe right = edit / duplicate (additive to the existing long-press action sheet).
- **Undo snackbar** after delete instead of the current irreversible flow.
- Bulk-select mode for multi-delete / multi-move.
- Sticky month headers plus a jump-to-month scrubber.
- Pull-to-refresh that triggers a sync.
- Attachment viewer directly from the card (currently attachments aren't tappable).

### Navigation and chrome

- **Bottom tab bar** (Dashboard / Transactions / Charts / Settings). The app is drill-down only today,
  so reaching anything takes two or three taps.
- Pull-to-refresh, haptic feedback (`navigator.vibrate`) on save/delete, and scroll-position restoration on back.
- **Global search** across transactions, contacts and products from the dashboard.

### Dashboard — `dashboard/index.vue`, `BookCard.vue`

- Book cards currently show only name and created date. Add **balance, this-month spend, and a mini sparkline**.
- Cross-book "This month" summary card.
- Quick-add FAB that remembers the last-used book.

### Formatting and locale

- `formatCurrency` hardcodes `en-IN` and renders **no currency symbol**; `dateUtils` hardcodes `en-US`.
  Add a settings-driven locale/currency (NPR/INR).
- `getNepalDate` is currently a stub that just returns `new Date()`.
- Optional Bikram Sambat (BS) date display if that's the target context.

---

## 3. New mobile-first features

### Habit-forming (drives daily use)

- **Recurring transactions** — rent, salary, subscriptions, with a "due today" prompt on app open.
- **Budgets per category** with a progress ring on the dashboard and warnings at 80% / 100%.
- **Savings goals** with contribution tracking.
- **Transaction templates / favourites** — one tap to re-add a regular expense.
- A "Today" summary card pinned to the top of the dashboard.

### Money-tracking gaps

- **Contact ledger** — per-person payable/receivable balance ("Ramesh owes you 2,500"). The contact
  field already makes this data available.
- **Payment-mode reconciliation** — opening/closing balance per cash/wallet account.
- **Soft delete + Trash** so deletes are recoverable.
- **CSV / PDF export** and share-sheet export (currently JSON-only via `DatabaseBackup.vue`).
- **Receipt OCR** to prefill amount, date and merchant.
- **Multi-currency** for travel books.

### Charts — `book-charts/`

- Cash-flow (income vs expense over time), net-worth trend, and category donut/breakdown.
  The current set is mostly month/year line and bar charts.
- Touch-friendly tooltips and larger hit targets.

### PWA-native extras

- Manifest `shortcuts` ("Add expense", "Add income"), `share_target` (share a receipt image into the app),
  and `screenshots` for a richer install prompt.
- Custom **install prompt** with iOS "Add to Home Screen" instructions.
- App badge with today's transaction count.
- Optional push/reminder notifications.

---

## 4. Performance and data layer

- `store/transactionStore.js` loads **every transaction for the book** into memory and filters client-side.
  Move to Dexie range queries plus pagination — the load-more UI already exists. This matters most on
  mid-range phones.
- `store/syncStore.js` is **push-only full-DB**, and `sync_status` is written but never cleared. Add
  pull/merge, per-record dirty flags, retry with backoff, and Background Sync.
- `composables/useDatabaseExport.js` import is full-replace with no preview or validation. Add a
  merge-vs-replace choice and a diff summary.
- `ImageUpload` is a ~232 KB chunk. Compress before upload and lazy-load it only on the form.

---

## Suggested order

1. **PWA correctness** — manifest and icons, safe-area, theme-color, update prompt. Roughly a day's work,
   immediately visible.
2. **Entry flow polish** — `inputmode`, unsaved guard, non-blocking dialogs, undo delete.
3. **Bottom navigation + dashboard balances.**
4. **Recurring transactions + budgets** — the features most likely to make the app open daily.
5. **Contact ledger + CSV export.**
6. **Sync rewrite + transaction pagination** — do this before the dataset grows.
