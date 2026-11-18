# Money — Improvements & New Features

> Mobile-first roadmap. This app is used primarily on a phone (installed PWA), so every item below is
> prioritised around touch input, small screens, offline behaviour, and daily-use convenience.

**Status legend:** ✅ Done · 🔄 In progress · ⬜ Not started
**Last updated:** 18 November 2026

---

## 1. Fix first: PWA bugs that hurt installed mobile use

**Progress: 8 of 8 done.**

These are small fixes with outsized impact, because the app is consumed as an installed PWA.

| Status | Issue | Where | Impact |
| --- | --- | --- | --- |
| ✅ | `index.html` linked `/site.webmanifest`, whose `name` and `short_name` were **empty strings** | `index.html`, `public/site.webmanifest` | Fixed. The stale duplicate manifest was deleted and the app now uses only the generated manifest, so the installed app shows "Money Manager" / "Money" instead of a blank name. |
| ✅ | Manifest referenced `pwa-192x192.png`, `pwa-512x512.png`, `masked-icon.svg` — **none of these exist** | `vite.config.js` | Fixed. The manifest now points at the real `android-chrome-192x192.png` / `android-chrome-512x512.png` assets, with a maskable entry added. No more 404s during install. |
| ✅ | No full-screen viewport handling, no safe-area insets | `index.html`, `FixedSaveButton.vue`, `FloatingActionButton.vue`, `PageLayout.vue`, `PageHeader.vue` | Fixed. The viewport opts into the full screen and the fixed save bar, FAB, page padding and sticky header all respect the notch and home indicator. |
| ✅ | No `theme-color`, no `apple-mobile-web-app-*` metas | `index.html` | Fixed. iOS standalone metas added, and the browser chrome colour now follows the active theme (light or dark) instead of staying white. |
| ✅ | `registerType: 'prompt'` with **no update UI** | `vite.config.js`, `App.vue` | Fixed. A "new version available" prompt with Reload / Later now appears when a fresh build is deployed, and the app checks for updates hourly while open. |
| ✅ | Online/offline indicator and photo upload queue | App status strip and Sync settings | Photos persist on the device offline and upload before data sync; queue limits and retry errors are visible. |
| ✅ | Plain-text transaction descriptions | Transaction cards, chart modal, form, search and exports | Legacy markup is converted to readable text; descriptions use safe interpolation. |
| ✅ | Hardened PIN and API-token storage | Security and Sync settings | PIN hashing, device-local token encryption and persistent PIN lockouts; insecure contexts show a warning. |

---

## 2. Mobile UX upgrades to existing features

**Progress: 20 of 22 done.**

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
- ✅ **Month / year browser** under the chips. Choosing **All** opens a second row with an All | Month | Year
  control and a `‹ September 2026 ›` stepper. The label is tappable and opens a picker of every month (or
  year) from the first record to the current month, so old entries are one tap away instead of dozens of
  arrow presses. The picker never offers a future period or anything before the history starts, and the
  arrows disable at both ends. It opens on **All**, so the chip still shows everything until Month or Year
  is picked, and the chosen period drives the month groups, totals and opening balance. It survives a
  reload through the URL.

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

- ✅ `formatCurrency` still renders **no currency symbol** by design, and now follows a settings-driven
  locale. The date helpers use the same setting, so amounts and dates are written consistently.
- ✅ `getNepalDate` returns the current Nepal wall-clock date (`Asia/Kathmandu`) instead of a plain
  `new Date()`, and the daily defaults use it.
- ✅ Optional **Bikram Sambat (BS)** date display: a switch in Settings turns dates in the list, cards and
  charts into BS, with English or Nepali month names depending on the locale. Entry, filters and storage
  stay Gregorian.

---

## 3. New mobile-first features

**Progress: 8 of 17 done.**

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
- ✅ **Soft delete + Trash** for transactions: recover deleted entries from Book Settings for 30 days on this device, or delete forever. Other entities remain hard-delete.
- ✅ **CSV / PDF export** and share-sheet export — pick a book or all books, narrow it to a period, then
  share the file into WhatsApp, Mail or Files, or download it. JSON backup stays in `DatabaseBackup.vue`.
  *(Done 17 Nov 2026.)*
- ⬜ **Receipt OCR** to prefill amount, date and merchant.
- ⬜ **Multi-currency** for travel books.

### Charts — `book-charts/`

- ⬜ Cash-flow (income vs expense over time), net-worth trend, and category donut/breakdown.
  The current set is mostly month/year line and bar charts.
- ✅ Touch-friendly chart tooltips, column-wide interaction, larger point hit areas, and larger navigation, date-chip, thumbnail and selection targets.

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

**Progress: 3 of 4 done.**

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
- ✅ The image upload component is a ~232 KB chunk. Photos are now resized and re-encoded on the device
  before upload, and the widget is loaded only when it actually comes into view, so opening a form no
  longer downloads FilePond. *(Done 17 Nov 2026.)*

---

## Suggested order

1. ✅ **PWA correctness** — manifest and icons, safe-area, theme-color, update prompt. *(Done 15 Nov 2026.)*
2. ✅ **Entry flow polish** — inputmode, unsaved guard, non-blocking dialogs. *(Done 15 Nov 2026.)*
3. ✅ **Bottom navigation + dashboard balances.** *(Done 15 Nov 2026.)*
4. ✅ **Recurring transactions + budgets** — the features most likely to make the app open daily.
   *(Done 15–16 Nov 2026.)*
5. ⬜ **Contact ledger + CSV export.** CSV and PDF export shipped on 17 Nov 2026; the contact ledger is
   still open.
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

**Still open in Section 4:** import merge-versus-replace with a diff summary.

### 17 November 2026 — image compression and lazy upload chunk

Phones were uploading camera photos untouched, and every form that could attach an image downloaded
FilePond (and its preview plugin) even if the user never scrolled to the uploader.

- **Compression**: a new `utils/imageCompression.js` redraws the file on a canvas with its long edge capped
  at 1600 px and re-encodes it as JPEG at quality 0.8. PNGs stay PNG only when they really use
  transparency. Files under 250 KB, animated/vector formats, and anything the browser cannot decode (HEIC,
  for example) are uploaded as-is, and a result that is not smaller than the original is thrown away.
  Both the "Take photo" button and FilePond go through `uploadService.uploadImage`, so every path is
  covered. FilePond's own size limit was raised from 5 MB to 20 MB because the shrinking now happens on
  the device.
- **Lazy loading**: a small `LazyImageUpload.vue` wrapper async-imports the widget and mounts it only when
  an IntersectionObserver says it is about to enter the viewport. The transaction form, the new-product
  modal inside it (also used by the recurring form) and the product form all use the wrapper.
- **Result**: the upload chunk is no longer part of the transaction form's initial load. It is fetched
  when the uploader is scrolled into view, or when the product modal is opened, and never on screens that
  have no uploader (such as the book list).

Verified on a production build with a mock upload endpoint: opening a transaction did not request the
upload chunk and rendered no FilePond markup; scrolling to the uploader fetched the chunk and rendered the
camera button and drop zone; a 6.1 MB 3000×2000 JPEG arrived as a 730 KB 1600×1067 JPEG; a 10.1 MB
2200×1400 PNG with transparency arrived as a 6.5 MB 1600×1018 PNG; the book list, the recurring form with
its product modal closed and the un-scrolled transaction form requested no upload chunk; opening the
product modal did fetch it. No console errors.

### 17 November 2026 — CSV and PDF export with share-sheet support

The only way to get data out of the app was a full JSON dump, which is a backup, not something you can
send to an accountant or open in a spreadsheet.

- **Where**: a new Export card at the top of Settings → Import / Export, above the existing JSON backup.
  It has the same period chips as the transaction list (All, This Month, Last Month, Today, Yesterday,
  This Year, Last Year, Custom Date Range), a book selector ("All books" plus each book), a live count of
  the rows that will be exported, and a row each for CSV and PDF with Share and Download buttons. When the
  book and period match nothing, the card says so and the buttons are disabled.
- **CSV**: every transaction with date, type, book (all-books exports only), category, payment mode,
  contact, description, products, discount, charge and amount. The file is UTF-8 with a byte-order mark so
  Excel detects the encoding, uses CRLF line endings, and quotes any value containing a comma, a quote or a
  newline. Money columns always show two decimals.
- **PDF**: a printable A4 statement drawn on a canvas and embedded in a hand-written PDF, so no PDF library
  is added to the bundle and it works offline. Page one shows the book, period, generation time and
  income/expense/net totals; long exports continue with a repeated header and "Statement (continued)".
  Devanagari and other scripts render through the system font. Text is an image, so it is not selectable.
- **Sharing**: when the browser can share files, Share hands the file to the system share sheet so it can
  go straight into WhatsApp, Mail, Drive or Files. A cancelled share does nothing; any other failure falls
  back to a download so the export is not lost. Browsers without file sharing only see Download.

Verified on a production build with a seeded 45-row, two-book database: the card listed both books and
"All books", the count changed from 45 to 15 when a single book was selected, the CSV carried the BOM, the
expected header and all 45 rows, kept commas/quotes/newlines intact and preserved a Nepali description; the
PDF was a valid two-page document with two-decimal amounts, correct totals and page numbers, and rendered
both pages correctly including the Nepali row; with a mocked share API the CSV and PDF arrived as files with
the right name, type and size, and when the share was refused the file was downloaded and the toast said so;
with file sharing unavailable only Download buttons appeared and downloads still worked. No console errors.

The period filter was verified separately: the chips matched the transaction list, "This Year" kept all 45
rows, "Last Year" dropped to zero, showed "No transactions match this book and period." and disabled both
formats; a custom 1 Jan – 28 Feb 2026 range counted 15 rows, exported exactly those 15 in the CSV with every
date inside the range, and produced a one-page PDF labelled 5 Jan 2026 – 25 Feb 2026 whose totals only
covered that period; combining the same range with the Business book counted 5, and returning to "All" for
that book restored 15. No console errors.

### 17–18 November 2026 — month and year browsing in the transactions list

The transaction list could jump to a month with the scrubber, but only for the months already loaded, and
the date chips had nothing between "This Month" and "This Year". Finding an entry from a specific month
meant scrolling.

- **Where**: choosing the **All** chip now opens a second row under the chips. On the left is an
  **All | Month | Year** segmented control; on the right is `‹ November 2026 ›`. It opens on **All**, so
  the chip still shows the complete history until a narrower period is picked.
- **Picking a period**: the label between the arrows is tappable and opens a picker of every month — or
  every year — from the book's first record up to the current month, newest first. A month three years back
  is one tap instead of thirty-six. The arrows still step one month or year at a time.
- **Bounds**: the picker starts at the month of the book's first record and stops at the current month, so
  it never offers an empty future period or anything before the history starts. Both arrows disable at the
  ends, and a stale or hand-edited link that points outside the range is pulled back to the nearest bound.
  The range is re-read whenever the list changes, so adding an older entry or deleting the oldest one moves
  the limit with it.
- **Wiring**: the page turns the choice into a date range (first to last day of the month, or 1 January to
  31 December) and sends it into the same Dexie window as the preset chips. The list, the month groups,
  their totals and the opening balance all follow the visible period, and the month scrubber only shows the
  months inside it. The state is kept in the URL as `period` and `periodAnchor`, so a reload, a back step or
  a shared link lands on the same month.
- **Fix found on the way**: restoring filters from the URL had never worked. The filter-to-URL watcher
  flushes before `onMounted`, so reading `route.query` there returned the rewritten URL and a deep link
  always fell back to This Month. The component now snapshots the incoming query during setup and reads
  that, and it ignores a `filter` value that is not one of the chips.

Verified on a production build at 390 px with a seeded book running from March 2024 to November 2026: the
row appeared only for All and showed the All segment as active with every row listed; Month opened on
November 2026 with the next arrow disabled; the picker listed 33 months from November 2026 back to March
2024; picking April 2025 showed its two rows and picking March 2024 showed one with the previous arrow
disabled; Year listed 2026, 2025 and 2024, stepped between them, and disabled the next arrow on 2026 and the
previous arrow on 2024; tapping the All chip again while in Month mode reset the segment to All. Reloading
`?filter=all&period=month&periodAnchor=2026-09` restored September 2026, a future anchor (`2031-05`) fell
back to November 2026, and an anchor older than the history (`2019-01`) clamped to March 2024. The stats
followed the visible period — November opened on 1,667 (Dr) and closed on 3,111 (Dr), October on 667 (Dr)
and 1,667 (Dr), 2026 on 111 (Dr) and 4,000 (Dr), and the All segment on 0 and 4,000 (Dr). The This Month
chip hid the row again. Light and dark layouts checked at 390 px, including the long "September 2026"
label, which fits without clipping. No console errors.

### 18 November 2026 — locale settings, Nepal time and Bikram Sambat dates

Amounts had always used Indian digit grouping and dates had always used the US order, regardless of who
was reading them. `getNepalDate` was a stub that returned `new Date()`, so a device in another time zone
could open a new transaction on the wrong day. Bikram Sambat was not available at all.

- **Where**: Settings → Appearance has a new **Language & region** card. It holds a locale picker —
  English (India), English (US) or नेपाली (नेपाल) — and a PIN-style switch for **Bikram Sambat dates**, plus
  a live preview of an amount and today's date. Both save as soon as they change and survive a reload.
- **Amounts and dates**: `formatCurrency` still shows no currency symbol on purpose, but it now follows the
  locale, so Indian grouping (12,34,567.89) and Western grouping (1,234,567.89) are both available. The
  date and time helpers read the same setting, which also reaches book cards, the transaction list, charts,
  recurring due dates, sync timestamps and PDF statements. CSV numbers stay plain for spreadsheets.
- **Nepal time**: `getNepalDate` now asks `Intl` for `Asia/Kathmandu` and returns a date whose fields are
  Nepal wall-clock time. New and duplicated transactions, Today / This Month / This Year chips, dashboard
  summaries, period bounds and recurring due dates use it, so a phone set to Hawaii still starts a new
  entry on the Nepali day rather than the previous one.
- **Bikram Sambat**: a small bundled conversion table (2000–2090 BS, no library) turns AD dates into BS.
  With the switch on, the list groups months by BS month — so a BS month is not split at an AD boundary —
  and the month headers, date headers, scrubber, book cards, charts and PDF dates follow. English uses
  transliterated month names (Baisakh, Mangsir…); Nepali uses Devanagari names and digits. Gregorian dates
  in नेपाली use their own Nepali month names and Devanagari digits too, because the browser's `ne-NP` data
  falls back to English. Entry, date filters, URL state and storage stay Gregorian, so the switch is purely
  a display choice.

Verified on a production build at 390 px with the seeded March 2024 – November 2026 book: the Appearance
card showed English (India) and a preview of 12,34,567.89 / 18 Nov 2026; switching to English (US) changed
the preview to 1,234,567.89 / Nov 18, 2026 and persisted after a reload; turning on BS changed it to
2 Mangsir 2083. With BS on, the list's All view grouped the same rows into Kartik 2083, Aswin 2083, Bhadra
2083, Magh 2082, Kartik 2082, Baisakh 2082, Chaitra 2081, Mangsir 2081 and Chaitra 2080, with matching
scrubber labels. Choosing नेपाली produced कार्तिक २०८३ and सोम १६ कार्तिक २०८३. With the device time zone
forced to Pacific/Honolulu (still 17 November there), a new transaction opened on 18 November, the Nepal
date. The charts followed the setting too: Monthly Trends grouped by BS month with Nepali labels, while the
yearly comparison kept its Gregorian month axis (localized) because it compares AD years. Light and dark
layouts checked; no console errors.

### 18 November 2026 — Offline status and queued photos

Added a global status strip, persistent compressed photo queue (20 photos / 40 MB), local previews after
reload, queue-first sync, permanent-error reporting and Retry now. Completed uploads resolve open-form
references and recover after interrupted processing. Book deletion clears queued photos. The legacy
full-backup endpoint remains the default; the server API is unchanged.

### 18 November 2026 — Plain-text descriptions

Removed HTML rendering from transaction cards and chart modals. The same text helper handles legacy
markup in the edit form, search, CSV and PDF output. Database version 15 converts existing descriptions
without changing sync status or scheduling sync. Ordinary plain-text descriptions remain unchanged.

### 18 November 2026 — Transaction Trash

Database version 16 keeps local transaction snapshots for 30 days. Book Settings has Restore, Delete
forever and confirmed Empty trash. Undo uses those persisted snapshots. A delete not yet attempted
restores its original identity; a synced or attempted delete restores with a new identity. Sync and
restore are serialized, including across tabs where Web Locks is available. Book deletion clears Trash.
Trash and photo queue data are excluded from backup and sync.

### 18 November 2026 — Touch interaction

All three charts share larger tooltips and point hit areas, formatted values and column-wide selection.
Enlarged the month rail, period arrows, date chips, back button, receipt thumbnails and selection buttons.

### 18 November 2026 — Device secret storage

Existing plaintext PINs migrate to salted PBKDF2-SHA256 hashes (210,000 iterations), and API tokens to
AES-GCM ciphertext using a non-extractable device key. Five incorrect PIN attempts trigger a persisted
30-second lockout, doubling to a maximum of five minutes; success resets it. The keypad shows the
countdown. Non-secure contexts retain legacy storage with a visible warning. This protects casual
database inspection, not code running in the app origin or the financial records themselves.

Verification: production build and the isolated Chrome data suite cover the version-13 database upgrade,
secret migration, encryption after reopening storage, lockout persistence/escalation, photo queue caps,
thumbnail recovery, upload single flight, local-reference sync guards, permanent upload failures, Trash
restore identities/expiry, book cleanup, backup exclusion and the unchanged full-backup sync protocol.
Run the suite with npm run test:browser (Chrome required; CHROME_PATH can override its location).

Production PWA checks also passed at 390 px in light/dark mode: offline reload restored the photo
preview; the 11-month rail, Trash and charts fit; the PIN lockout countdown disabled the keypad. No
console errors or horizontal page overflow. The data suite uses a mocked server, not live credentials.
