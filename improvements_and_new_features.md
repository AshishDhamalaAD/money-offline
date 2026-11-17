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

**Progress: 16 of 21 done.**

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

- ✅ **Swipe actions** — swipe left reveals Delete; swipe right reveals Edit and Duplicate. Only one row
  stays open at a time, and the long-press action sheet still offers Copy, Move, Duplicate and Delete. A
  short guard after a long press stops the releasing tap from immediately closing the sheet.
- ✅ **Undo snackbar** after delete instead of the old irreversible flow. Deletes happen immediately and a
  bottom snackbar offers Undo for five seconds; deletes made while it is visible are grouped, so one Undo
  restores them all. The delete confirmation modal is gone.
- ✅ **Bulk-select mode** for multi-delete / multi-move. A select button next to the filters turns rows into
  checkboxes and shows a bar with the count, Select all / Clear, Move and Delete. The quick-add button
  hides while selecting, multi-delete uses the same undo snackbar, and multi-move reuses the target-book
  dialog.
- ✅ **Sticky month headers** plus a jump-to-month scrubber. Transactions are grouped by month with a sticky
  header showing the month total, day groups below it, and a right-edge month rail that highlights the
  active month and scrolls to it on tap.
- ✅ **Pull-to-refresh** that triggers a sync, with pull / release / refreshing states and a toast for the
  result.
- ✅ **Attachment viewer** directly from the card: thumbnails are tappable and open a full-screen viewer
  with a counter, previous / next arrows, swipe navigation and a close button, without opening the entry.

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

**Progress: 5 of 17 done.**

### Habit-forming (drives daily use)

- ✅ **Recurring transactions** — rent, salary, subscriptions, with a "due today" prompt on app open.
  *(Done 15–16 Nov 2026.)*
- ✅ **Budgets per category** with a progress ring on the dashboard and warnings at 80% / 100%.
  *(Done 15–16 Nov 2026.)*
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
- ✅ Custom **install prompt** with iOS "Add to Home Screen" instructions. A dismissible card offers Install
  where the browser supports it, shows the Safari Share → Add to Home Screen steps on iOS, and stays quiet
  for two weeks after "Not now". The Settings App tab keeps the install action and instructions available
  afterwards.
- ✅ App badge showing how many **scheduled recurring transactions are waiting to be created**. It follows
  the same due rules as the in-app prompt, updates live when a rule is paused, resumed or completed, and
  clears when nothing is due.
- ✅ Optional **reminder notifications**. Turning them on asks for permission, sends one daily reminder at a
  chosen time when something is due, and offers a test notification. The service worker focuses or opens
  the app when a notification is tapped, and also handles push payloads for a future server sender.

---

## 4. Performance and data layer

**Progress: 2 of 4 done.**

- ✅ `store/transactionStore.js` no longer loads **every transaction for the book** into memory. The list
  screen now reads a date-ranged window from Dexie through a new compound book-and-date index, applies
  type, category, payment mode, contact, product and search filters inside the query, and grows by 50-row
  pages with the existing Load More button. Period stats are streamed from the database rather than
  computed from the loaded rows. *(Done 16 Nov 2026.)*
- ✅ Sync is no longer **push-only full-DB**. Local writes are marked pending per record and only those
  rows are uploaded; deletions travel as tombstones; the app pulls changes from other devices and merges
  them last-writer-wins; failures retry with backoff and ask the browser to retry in the background.
  Settings has a switch between this and the original full backup upload, which stays the default so
  servers that only accept a full backup keep working unchanged. *(Done 17 Nov 2026.)*
- ⬜ `composables/useDatabaseExport.js` import is full-replace with no preview or validation. Add a
  merge-vs-replace choice and a diff summary.
- ⬜ The image upload component is a ~232 KB chunk. Compress before upload and lazy-load it only on the form.

---

## Suggested order

1. ✅ **PWA correctness** — manifest and icons, safe-area, theme-color, update prompt. *(Done 15 Nov 2026.)*
2. ✅ **Entry flow polish** — inputmode, unsaved guard, non-blocking dialogs. *(Done 15 Nov 2026.)*
3. ✅ **Bottom navigation + dashboard balances.** *(Done 15 Nov 2026.)*
4. ✅ **Recurring transactions + budgets** — the features most likely to make the app open daily.
   *(Done 15–16 Nov 2026.)*
5. ⬜ **Contact ledger + CSV export.**
6. ✅ **Sync rewrite + transaction pagination** — done before the dataset grows. Pagination shipped on
   16 Nov 2026, incremental two-way sync on 17 Nov 2026.

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

**Still open in Section 2:** haptic feedback on save/delete and scroll-position restoration on back
(pull-to-refresh now exists on the transaction list); global search; and locale-aware currency formatting.

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

### 15–16 November 2026 — Recurring transactions and budgets (phase 4)

Shipped the two habit-forming items from Section 3:

- **Recurring transactions** reuse the transaction form itself: type, amount, category, payment mode,
  contact, products, discount/charge and a multiline description, plus a repeat frequency (daily, weekly,
  monthly, start of month, end of month, yearly) and a start date. They are managed from a new Recurring
  tab in book settings, where each rule shows its next date, can be paused and resumed, edited or deleted.
- On app open, an **app-level due sheet** lists every active rule whose next date has arrived, across all
  books. Each row shows the book, amount, due date and how many periods are outstanding; "Review" opens
  the transaction form prefilled with the rule, with any line items already expanded, so the entry can be
  checked or changed before saving, and "Later" dismisses the sheet for the session.
- Saving a reviewed entry **advances that rule by one period**. If several periods were missed, the rule
  stays due and is offered again, so each missed entry is reviewed rather than bulk-created.
- **Monthly budgets per category** live under a new Budgets tab. Each category can have one limit, and the
  list shows a ring, amount spent versus limit and an amber warning at 80% or a red over-budget note at
  100%.
- The dashboard gained a **budget card** for the last-used book: up to four category rings with spend,
  plus a single warning line when any budget is near or over its limit. "Manage" jumps to the budget list.
- Recurring rules and budgets are included in the JSON backup, and deleting a book removes its rules and
  budgets along with the rest of that book's data.

Verified against a production build with seeded data: the due sheet appears on open with the right
outstanding counts, "Later" closes it, "Review" opens the transaction form with the rule's amount, date,
category, payment mode and description already filled, saving that entry creates the transaction and moves
the rule to the next period, month-start and month-end rules land on the 1st and last day, a budget created
through the UI appears with correct progress, the dashboard rings turn amber and red at the thresholds, and
deleting a book clears its recurring and budget rows while leaving other books intact.

### 16 November 2026 — Transaction list swipe, undo and bulk actions

Shipped all six transaction-list items from Section 2:

- **Swipe actions** on each row: left reveals Delete, right reveals Edit and Duplicate. Only one row stays
  open at a time, tapping the card closes it, and the existing long-press sheet still offers Copy, Move,
  Duplicate and Delete. The sheet now ignores backdrop taps for a moment after opening so the tap that
  ends a long press cannot close it instantly.
- **Undo after delete**: deleting is immediate and a bottom snackbar offers Undo for five seconds.
  Consecutive deletes are grouped into one snackbar, and the delete confirmation dialog was removed.
- **Bulk select**: a select button beside the filters turns rows into checkboxes and shows a bottom bar
  with the count, Select all / Clear, Move and Delete. The quick-add button hides during selection,
  multi-delete gets the same undo, and multi-move reuses the target-book dialog.
- **Month grouping and navigation**: transactions are grouped by month with a sticky header carrying the
  month total, day groups underneath, and a right-edge month rail that tracks the month in view and jumps
  to a month on tap.
- **Pull-to-refresh**: pulling down at the top of the list runs a sync with pull, release and refreshing
  states, then reports the result in a toast.
- **Attachment viewer**: card thumbnails are tappable and open a full-screen viewer with a counter,
  previous / next arrows, swipe navigation and a close button, without opening the entry.

The transaction store now returns the deleted rows and can restore them by id, which is what makes undo
work for both single and bulk deletes.

Verified against a production build with 30 seeded transactions across three months: swiping right opened
the edit tray and Edit navigated to the entry, swiping left opened Delete and removing a row took the
count from 30 to 29 with the snackbar, Undo restored it to 30 and showed a confirmation toast, long press
opened the action sheet, bulk select showed the count and Select all, moving two rows changed their book
and cleared the selection, bulk delete removed two rows and Undo restored both, the month rail jumped to
September with the header sticking at the page-header edge while scrolling, pull-to-refresh showed the
release and refreshing states and a result toast, and the attachment viewer opened, reported 1 / 1 and
closed cleanly.

### 16 November 2026 — PWA-native extras and settings tab scrolling

Shipped the three PWA extras from Section 3 (the manifest shortcuts / share target / screenshots item is
still open):

- **Custom install prompt**: a dismissible card appears shortly after load when the browser offers an
  install event, with an Install button, and shows Safari's Share → Add to Home Screen steps on iOS.
  "Not now" hides it for two weeks. A new **App** tab in Settings keeps the install action, iOS steps and
  an "installed" state available after the card is gone.
- **App badge**: the home-screen icon now shows how many scheduled recurring transactions are waiting to
  be created, matching the rules the in-app due prompt uses. It updates live through Dexie, refreshes when
  the app returns to the foreground, and clears when nothing is due.
- **Reminders**: the App tab has a switch, a reminder time and a test button. Enabling it requests
  notification permission; once a day, at or after the chosen time, the app sends one notification when
  something is due, and remembers that it already fired that day. Reminders are local notifications rather
  than a server push — the service worker now also handles push payloads and focuses or opens the app when
  a notification is tapped.
- The service worker moved from the generated worker to a small custom one so notification taps and push
  payloads can be handled. Precaching, cleanup, the update prompt and the SPA navigation fallback behave
  as before.
- Fixed the horizontally scrolling tab strips in book settings (Products, Categories, Payment Modes,
  Budgets, Recurring) and the main Settings tabs. Each route change mounted a fresh strip at its start, so
  opening Recurring or Budgets showed the right page while the strip jumped back to Products and
  Categories. The active tab is now centred in view on mount and whenever it changes.

Verified against a production build with two due recurring rules, one future rule and one paused rule: the
worker registered and controlled the page with a populated precache, the badge reported 2, paused and
resumed a rule to move it to 1 and back to 2, a simulated install event showed the banner and "Not now"
stored the two-week dismissal, an iPhone user agent showed the Share → Add to Home Screen instructions,
the Recurring and Budgets tabs stayed centred (scroll position 170) instead of resetting, the App tab
showed the install card and reminders switch, the test notification and the daily reminder both fired with
"2 scheduled transactions are ready to review.", the reminder was marked as shown for the day, and there
were no console errors.

### 16 November 2026 — Paged transaction list (performance, part 1 of 4)

Moved the book transaction list off "load the whole book, then filter in the browser":

- Added a database version that indexes transactions by book and date together, so a book plus a date
  range becomes one key range. Dates are stored as sortable timestamp strings, so range bounds are plain
  string comparisons.
- The transaction store gained a paged list: it subscribes to a live window of the query, starts at 50
  rows and grows by 50 when Load More is pressed. Only that window is held in memory, and the live query
  re-runs the whole window, so edits, deletes, undo and syncs still update the list instantly.
- Type, category (including product categories), payment mode, contact, product and text search are all
  evaluated inside the Dexie query instead of after a full load. One extra row per query tells the list
  whether another page exists, without a count.
- The stats panel streams totals from the database across the whole filter range, and the opening balance
  is a second ranged query of everything before the start date. "Show Stats" is therefore correct even
  when only the first page is on screen.
- Bulk "Select all" now selects the loaded rows only, which is the trade-off of not keeping older pages in
  memory. Selection is cleared when filters change.
- The charts page keeps the old full-book load, because it needs every row to aggregate. The transaction
  form now reads the row it is editing straight from the database instead of from the store array.

Verified against a production build with 130 seeded transactions across three months: the new index was
present after the upgrade, the month view showed 45 rows with no Load More, its stats matched the seed
exactly (opening, closing, in, out and net), All showed 50 then 100 then 130 rows with Load More
disappearing, All stats matched the whole dataset, searching "Coffee" returned the expected 39 rows,
choosing the Food category returned 50 rows and 98 after Load More, deleting and undoing a row updated the
list live, the edit form opened the correct row with its amount, and charts still rendered.

**Still open in Section 4:** sync pull/merge with dirty flags and retry, import merge-versus-replace with a
diff summary, and image compression plus lazy loading of the upload chunk.

### 17 November 2026 — Incremental two-way sync (performance, part 2 of 4)

Replaced the "upload the whole database after every edit" sync with a change-based one:

- **Per-record dirty flags**: every row already carried `sync_status`; it is now meaningful. Rows are
  written as pending by the stores and flipped to synced only after the server accepts them. A Dexie hook
  on every synced table schedules a debounced sync, so categories, products, budgets and recurring rules
  are covered too, not just transactions.
- **Deletions**: a new tombstones table records `table`, `record id` and time for every local delete, so
  removals can be pushed instead of silently vanishing. Undo drops the matching tombstone. Deleting a book
  records tombstones for all of its cascaded rows.
- **Pull and merge**: the app asks the server for changes since its stored cursor and merges them into
  Dexie. Remote rows win only when their timestamp is newer; a local edit newer than a remote delete
  brings the row back and pushes it. Cursor, client id and retry state live in a small sync-state table.
- **Push**: only pending rows and tombstones are uploaded, 200 at a time. The whole-database dump remains
  as a fallback for servers that answer 404/405/501 on the changes endpoint, and is remembered so later
  syncs do not probe again.
- **Retries**: failures back off from 2 seconds to 5 minutes, persist across app restarts, and pause while
  offline. Client errors stop automatic retries instead of hammering the server. Requests time out after
  30 seconds.
- **Background Sync**: after a failure the app registers a `money-sync` tag; the service worker listens for
  it and asks an open window to run the sync. The retry schedule is respected, so a browser that fires the
  tag immediately cannot turn one failure into a burst of attempts. On iOS, where Background Sync is not
  supported, the app retries on next open or when connectivity returns.
- **Sync style switch**: Settings offers a switch between full backup and incremental sync. Full backup
  stays the default, so existing servers that only implement the original endpoint are never sent a
  request to the newer one. Turning incremental on is an explicit choice; if the server rejects it, the
  app falls back to full backups and says so in the status panel.
- **Visibility**: the book header shows how many changes are waiting, and Settings now shows the sync
  mode, pending count, last sync time, offline state and the next retry.

Verified against a production build with a local mock server implementing the protocol: only the three
pending rows were uploaded while the already-synced rows stayed untouched; a pull applied a newer remote
edit, inserted a new remote row and deleted a remotely removed one; a newer local edit beat an older
remote edit and was uploaded; a local edit newer than a remote delete survived and was re-uploaded;
deleting an entry from the list pushed a tombstone and cleared it; a 500 response kept the row pending,
scheduled a retry, showed the error and the countdown, then succeeded after the connection recovered; the
service worker received the background sync event and messaged the page; and a server without the changes
endpoint fell back to a single full-backup upload and marked everything synced. No console errors.

**Still open in Section 4:** import merge-versus-replace with a diff summary, and image compression plus
lazy loading of the upload chunk.
