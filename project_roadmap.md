# Money: Prioritized Feature and Improvement Roadmap

Reviewed: 20 November 2026.

Status: Recommendations only. No application features or fixes in this document have been implemented as part of this review.

## Purpose and Priorities

This roadmap is for personal, offline-first expense tracking. It follows a balanced approach: protect existing data and accurate totals first, then make daily tracking easier and add better financial planning.

Items are ordered within each priority group. P0 addresses data integrity and reporting accuracy; P1 improves everyday reliability and convenience; P2 adds money-management capabilities; P3 contains optional additions and longer-term improvements.

Effort is relative, not a delivery estimate: **S** = small, **M** = moderate, **L** = substantial. Dependencies identify work to complete or assess before starting an item.

Observed behavior below comes from source inspection unless explicitly described as tested. Proposed features are recommendations, not confirmed defects.

## Existing Capabilities

The app already provides:

- Multiple books, income and expense entries, transaction search and filters, duplication, and copying/moving records between books.
- Custom categories, global contacts, payment methods, product line items, discounts/charges, and product rate history.
- Monthly category budgets, recurring transactions, due-entry review, and reminders while the app can run its reminder checks.
- Receipt photos, offline photo queuing, image galleries, CSV/PDF exports, and JSON backup/restore.
- Local IndexedDB storage, an installable PWA, full-backup uploads, and optional incremental sync with a compatible server.
- Transaction Trash with restore, PIN/biometric locking, inactivity locking, light/dark themes, regional formatting, and Bikram Sambat date display.

These are foundations to extend, rather than features to add from scratch. The source is more current than parts of the existing documentation.

## P0 - Protect Data and Make Totals Trustworthy

### 1. Safe Backup and Restore

**Type:** Existing behavior improvement. **Effort:** L. **Dependencies:** None; coordinate with item 4.

- **Finding:** Restore checks only for a version and data object, then clears/imports individual tables without one encompassing transaction. An invalid record or later failure can leave partially replaced data. Table selection comes from the file rather than an explicit backup-table allowlist.
- **First version:** Validate the complete backup, supported format version, table names, record structure, and relationships before replacement. Preview record counts, offer a backup of current data, and perform replacement atomically. Coordinate with active sync, uploads, and local bookkeeping so restored records are handled consistently.
- **Success:** Invalid or interrupted imports leave current data intact. A valid backup restores a consistent set of records and can subsequently sync without stale deletion or upload state interfering.
- **Evidence:** [Restore flow](src/pages/settings/DatabaseBackup.vue), [backup format and tables](src/composables/useDatabaseExport.js), [sync bookkeeping](src/db/sync/dirty.js).

### 2. Consistent Category and Budget Calculations

**Type:** Correctness improvement. **Effort:** L. **Dependencies:** None; foundation for items 12 and 14.

- **Finding:** Category reports place amount-only entries under Uncategorized even when transaction categories are assigned. Budget progress adds the entire amount to every selected category. Product/category summaries use raw product amounts without allocating transaction discounts or charges, and product category lookup can use the current master category rather than a historical allocation.
- **First version:** Establish shared allocation rules for amount-only entries, multiple categories, product lines, discounts, charges, and uncategorized amounts. Make budgets, summaries, filters, and drill-downs use consistent results. Define how legacy records and later product recategorization are presented before changing historical totals.
- **Success:** Category allocations reconcile to each transaction's net amount. A 100 expense tagged with two categories does not silently become 200 of allocated spending. Summary rows agree with their drill-downs and budget progress.
- **Evidence:** [Category summary and drill-down](src/pages/book-charts/CategorySummaryTable.vue), [product summary](src/pages/book-charts/ProductSummaryTable.vue), [budget spend](src/pages/book-settings/budgets/BudgetList.vue), [dashboard totals](src/pages/dashboard/index.vue).

### 3. Prevent Duplicate or Invalid Transactions

**Type:** Data integrity improvement. **Effort:** M. **Dependencies:** None.

- **Finding:** Transaction saving sets a saving flag but does not guard against another submission; the fixed Save button has no loading/disabled interface. Explicit save validation focuses on product selection. Creating a recurring entry and advancing its rule are separate operations.
- **First version:** Add submission guards and visible saving feedback, with shared validation at the persistence boundary for amounts, dates, quantities, and referenced records. Save a recurring occurrence and advance its rule atomically, with occurrence-level duplicate protection.
- **Success:** Repeated taps or retries create one entry. Invalid data produces actionable feedback. Failure while completing a recurring occurrence cannot leave a saved expense with an unchanged due date that is offered again.
- **Evidence:** [Transaction save](src/pages/transaction-form/index.vue), [fixed Save button](src/components/common/FixedSaveButton.vue), [transaction persistence](src/store/transactionStore.js), [recurring completion](src/store/recurringStore.js).

### 4. Recover Receipts with Backups

**Type:** Backup capability extension. **Effort:** L. **Dependencies:** Item 1.

- **Finding:** JSON backups exclude queued photo blobs and retain server paths for uploaded photos. They do not independently preserve all receipt files; a local reference without its queued blob cannot recover an offline photo on another device.
- **First version:** Offer an attachment-inclusive backup format containing a file manifest and available receipt files. Explain missing or unavailable files and the coverage of the existing JSON format. Keep settings secrets out of backups.
- **Success:** Restoring an inclusive backup into a fresh browser recovers included receipt images without relying on the original browser's upload queue. Missing files are reported clearly.
- **Evidence:** [Exported tables](src/composables/useDatabaseExport.js), [local attachment hydration](src/utils/attachmentUrl.js), [server receipt paths](src/utils/imageUtils.js).

## P1 - Improve Everyday Reliability and Convenience

### 5. Date and Recurring-Schedule Consistency

**Type:** Correctness improvement. **Effort:** M. **Dependencies:** None.

- **Finding:** Some flows use Nepal wall-clock time while others use device time. Dashboard and budget month checks have a lower bound without a matching upper bound. Periods captured at mount do not automatically advance at midnight. Monthly recurrence clamps dates using the previous occurrence, which can drift from the original day after February.
- **First version:** Apply one explicit timezone policy to entry defaults, reporting periods, reminders, and filters. Refresh time-sensitive views across day/month boundaries. Preserve the intended recurrence day separately from short-month clamping.
- **Success:** Period totals agree near midnight across device timezones, exclude later months, and refresh without reopening the app. A monthly January 31 schedule can return to March 31 after February.
- **Evidence:** [Date helpers](src/utils/dateUtils.js), [recurrence helpers](src/utils/recurrence.js), [dashboard](src/pages/dashboard/index.vue), [budget list](src/pages/book-settings/budgets/BudgetList.vue), [due prompt](src/components/common/RecurringDuePrompt.vue).

### 6. Draft Recovery and Edit Protection

**Type:** Reliability feature and existing-flow improvement. **Effort:** M. **Dependencies:** Item 3 for safe submission.

- **Finding:** Unsaved-change detection initializes its snapshot only for new transactions. There is no persistent draft recovery, and the PWA update action does not explicitly coordinate with dirty forms.
- **First version:** Protect edited entries too, autosave unfinished drafts locally, and offer Resume/Discard after reopening. Preserve receipt references with drafts and coordinate update/reload prompts with unsaved work.
- **Success:** Editing then navigating away triggers protection. Reloading or an interrupted session offers recovery of an unfinished entry and its available attachments.
- **Evidence:** [Form snapshot and leave handling](src/pages/transaction-form/index.vue), [PWA reload](src/components/common/PwaUpdatePrompt.vue).

### 7. Backup Reminders and Storage Health

**Type:** New feature. **Effort:** M. **Dependencies:** Item 1; attachment messaging follows item 4.

- **First version:** Show when a backup was last generated, offer configurable backup reminders, display storage usage where supported, and offer persistent-storage requests with clear status.
- **Value and success:** Make it easy to notice old backups and storage pressure. Distinguish generating a download from knowing it was safely stored; never promise that a storage-persistence request guarantees recovery.
- **Starting points:** [Backup settings](src/pages/settings/DatabaseBackup.vue), [settings store](src/store/settingsStore.js).

### 8. Reusable Transaction Templates

**Type:** New feature extending quick entry. **Effort:** M. **Dependencies:** Item 3; item 6 recommended.

- **First version:** Add named favorites such as Lunch or Bus fare, reusing category, payment method, contact, description, and optional products. Keep amount and date easy to change.
- **Value and success:** Common entries require fewer decisions. Opening a template produces an editable form without creating a transaction until saved. Missing references are visible and repairable.
- **Starting points:** [Current defaults and prefill](src/pages/transaction-form/index.vue), [shared transaction fields](src/pages/transaction-form/TransactionFields.vue).

### 9. CSV Transaction Import

**Type:** New feature. **Effort:** L. **Dependencies:** Items 1 and 3; item 11 if importing into accounts.

- **First version:** Import uploaded CSV files with column mapping, date/amount preview, category/payment-method matching, validation, duplicate warnings, and a review step before committing.
- **Value and success:** Reduce manual entry of historical or bank-exported data. Preview errors before writing, report imported/skipped rows, and warn when the same data is imported again. Direct bank connections remain a separate project.
- **Starting points:** [Current CSV export](src/composables/useDataExport.js), [transaction store](src/store/transactionStore.js).

### 10. Broader Automated Checks

**Type:** Engineering improvement. **Effort:** M. **Dependencies:** Develop alongside items 1-6.

- **Finding:** Browser regression checks exist, but reporting reconciliation, restore failures, duplicate saves, and recurrence are not covered by the current suite. The runner defaults to a fixed macOS Chrome path and exposes an unhandled launch error when that browser is absent.
- **First version:** Add focused unit tests for financial/date transforms and browser checks for critical persistence flows. Run checks in CI, make browser configuration portable, and handle browser-launch failures cleanly.
- **Success:** Regression checks catch the P0 failure scenarios and run on a clean documented setup. Keep behavioral tests focused rather than duplicating implementation details.
- **Evidence:** [Existing browser checks](tests/data-flows.js), [test runner](tests/run-browser.mjs), [npm scripts](package.json).

## P2 - Make the App More Useful for Managing Money

### 11. Accounts and Real Transfers

**Type:** New financial model. **Effort:** L. **Dependencies:** Items 1-3; migration and sync compatibility assessment.

- **First version:** Track cash, bank, and card balances with opening balances and linked transfers. Keep books as organizational ledgers; current Copy/Move operations relocate records rather than model money transfers.
- **Value and success:** Answer where money is held. A transfer changes the two account balances while leaving combined income and spending unchanged. Existing records remain usable after migration.
- **Starting points:** [Current schema](src/db/dexie.js), [copy/move behavior](src/store/transactionStore.js).

### 12. More Useful Budgets

**Type:** Existing feature extension. **Effort:** M. **Dependencies:** Items 2 and 5.

- **First version:** Add an overall monthly limit, historical budget periods, remaining daily allowance, and optional rollover to existing category budgets.
- **Value and success:** Support spending decisions throughout a month and comparisons afterward. Historical months retain their intended limits; rollover is explicit and progress reconciles to corrected spending totals.
- **Starting point:** [Current budget store](src/store/budgetStore.js).

### 13. Upcoming Bills and Subscriptions

**Type:** Existing feature extension. **Effort:** M. **Dependencies:** Items 3 and 5.

- **First version:** Build an upcoming-payments view from recurring rules, with monthly commitments, annual subscription cost, snooze, and skip-occurrence actions.
- **Value and success:** See upcoming commitments without recording them as paid. Planned payments remain separate from actual transactions, and skipping or snoozing has a clear effect on the next occurrence.
- **Starting points:** [Recurring rules](src/store/recurringStore.js), [reminder checks](src/composables/useReminders.js).

### 14. Monthly Spending Review

**Type:** Analytics extension. **Effort:** M. **Dependencies:** Items 2 and 5.

- **First version:** Show changes against the previous month, largest category increases, top payees, and savings rate, with transactions behind every insight.
- **Value and success:** Explain what changed in spending. Compare equivalent periods, identify incomplete months, and handle zero income without an invalid savings percentage. Transfer/refund treatment should follow items 11 and 16 when available.
- **Starting point:** [Current charts](src/pages/book-charts/index.vue).

### 15. Savings Goals

**Type:** New feature. **Effort:** M. **Dependencies:** Items 1 and 3; account-linked goals follow item 11.

- **First version:** Add a target amount/date, manually recorded contributions, progress, and an estimated monthly contribution needed to reach the target.
- **Value and success:** Track progress toward a specific purchase or reserve. Goal contributions do not silently create duplicate expenses, and changing the target updates the projection clearly.

### 16. Refunds and Reimbursements

**Type:** New feature. **Effort:** M. **Dependencies:** Items 2 and 3; migration and sync assessment.

- **First version:** Link returned money to its original expense, support partial refunds, and track outstanding reimbursements separately from ordinary income.
- **Value and success:** Show what an expense ultimately cost and what is still owed back. A partial refund adjusts net spending predictably and remains traceable to the original entry.

### 17. Saved Searches and Batch Edits

**Type:** Existing-flow extension. **Effort:** M. **Dependencies:** Item 3; use corrected category behavior from item 2.

- **First version:** Save named filter combinations, add batch category/payment-method edits with a preview, and search readable contact, category, and payment-method names.
- **Value and success:** Make repeat reviews and cleanup faster. Preview exactly which records change; preserve selections across pagination deliberately and avoid modifying entries outside the reviewed set.
- **Starting points:** [Transaction filters](src/store/transactionStore.js), [book list and selection](src/pages/book-details/index.vue).

## P3 - Optional Additions and Longer-Term Improvements

### 18. Safer Multi-Device Sync

**Type:** Reliability improvement requiring protocol review. **Effort:** L. **Dependencies:** Item 1; access to the actual backend contract. Move higher if multiple devices are in regular use.

- **Finding:** Local records use auto-increment IDs; remote merge uses timestamp-based last-writer-wins behavior. Successful upload acknowledgements mark rows by ID, while full-backup acknowledgement marks all pending rows. Concurrent edits, ID collisions, and clock differences need dedicated assessment.
- **First version:** Test independent offline creation, edit/delete conflicts, and edits made during requests. Preserve recoverable overwritten versions, acknowledge only uploaded revisions, and expose useful conflict history. Assess server support before changing identities or protocol.
- **Success:** New edits made during an upload remain pending until their own successful upload. Two devices cannot silently overwrite unrelated records because their local IDs coincide.
- **Evidence:** [Schema](src/db/dexie.js), [merge behavior](src/db/sync/merge.js), [upload engine](src/db/sync/engine.js), [acknowledgements](src/db/sync/dirty.js).

### 19. Long-History Performance

**Type:** Performance improvement. **Effort:** M-L. **Dependencies:** Item 2 before optimizing aggregations.

- **Finding:** The transaction list already uses paged indexed queries, but dashboard and chart flows still load broad transaction collections.
- **First version:** Profile realistic multi-year histories, then introduce bounded queries, shared aggregations, and subscription cleanup where measurements show a benefit.
- **Success:** Record before/after load time and memory on a representative phone and dataset. Preserve totals and live updates while improving measured bottlenecks.
- **Evidence:** [Dashboard query](src/pages/dashboard/index.vue), [paged list and full-book chart query](src/store/transactionStore.js).

### 20. Accessibility and Clearer Errors

**Type:** Usability improvement. **Effort:** M. **Dependencies:** None; can accompany other UI work.

- **First version:** Improve dialog focus trapping/restoration, icon-button labels, keyboard navigation, nested-dialog behavior, and visible recovery actions for database failures. Replace remaining blocking browser alerts with consistent app feedback.
- **Value and success:** Forms and dialogs are usable with a keyboard and screen reader; failures explain a next action and do not look like successful empty states.
- **Starting points:** [Shared modal](src/components/common/BaseModal.vue), [backup UI](src/pages/settings/DatabaseBackup.vue).

### 21. Receipt Text Extraction

**Type:** Optional automation feature. **Effort:** L. **Dependencies:** Items 3, 4, and 6; assess local versus external processing.

- **First version:** Extract merchant, date, and amount from an existing receipt image into a reviewable draft. Explain any external processing and require confirmation before saving.
- **Value and success:** Reduce typing while retaining control over accuracy. An extraction failure leaves the receipt available and permits ordinary manual entry.

### 22. Currency and Calendar Extensions

**Type:** Optional regional capabilities. **Effort:** L. **Dependencies:** Items 2 and 5; account currencies coordinate with item 11.

- **First version:** If needed, identify currency per book and avoid combining unlike currencies without explicit conversion. Treat true Bikram Sambat entry/filtering as a separate extension of the current display support.
- **Value and success:** Totals never silently mix currencies, and calendar labels match actual period bounds. These are separate capabilities and can be selected independently.
- **Starting points:** [Current number formatting](src/utils/moneyUtils.js), [date formatting](src/utils/dateUtils.js), [BS conversion](src/utils/bikramSambat.js).

### 23. Independent Encrypted Backups

**Type:** Optional privacy feature. **Effort:** L. **Dependencies:** Items 1 and 4; secure-origin support and a documented recovery design.

- **Finding:** Existing app locks and device-token encryption do not encrypt financial records or downloaded backup files.
- **First version:** Offer password-encrypted backup files with documented restore and recovery instructions. Do not make portable backups depend on a key available only in the original browser.
- **Value and success:** A fresh device can restore using the backup password. An incorrect password or damaged file fails before changing current data.
- **Evidence:** [Current secret-storage scope](src/utils/secureStore.js), [current JSON backup download](src/pages/settings/DatabaseBackup.vue).

### 24. Maintainability and Documentation Cleanup

**Type:** Engineering improvement. **Effort:** M. **Dependencies:** None; update affected docs alongside future behavior changes.

- **First version:** Extract shared calculations and oversized page logic, remove unused code, and align repository guidance with the actual Pinia architecture and browser tests. Document existing budgets, recurring features, backup limits, and currency behavior accurately; remove duplicated or stale sections.
- **Value and success:** A calculation rule has one reusable home, affected behavior stays covered, and documentation distinguishes implemented features from this roadmap. Prefer scoped refactoring alongside relevant work over a broad rewrite.
- **Starting points:** [Feature documentation](project_features.md), [technical documentation](project_technical_details.md), [repository guidance](AGENTS.md), [project overview](README.md).

## Recommended Sequence and Verification

Start with items **1-4**, adding focused regression coverage from item **10** as each behavior changes. Then complete date consistency and draft protection before adding entry shortcuts or imports. Build planning features after the relevant financial calculations are dependable. Reorder optional items when actual usage justifies it, particularly multi-device sync.

The review established this baseline:

- `npm run build` passed, including service-worker generation. A build-tool deprecation warning did not prevent completion. Bundling success does not establish financial correctness or provide a separate type-checking guarantee.
- All five existing browser regression groups passed using `CHROME_PATH='/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' npm run test:browser` with an isolated localhost origin and temporary profile.
- Existing checks cover secret migration/PIN lockouts, safe descriptions, offline uploads, Trash identification, and Trash/backup exclusions. They do not establish reporting reconciliation, restore-failure safety, recurring-entry uniqueness, or production backend correctness.
- No personal financial records or production backend were inspected. Findings about those environments require separate verification.

Future implementation should include these meaningful acceptance scenarios:

- **Backup/restore:** Invalid versions, unknown tables, malformed records, missing relationships, interruption, older compatible backups, queued receipts, and fresh-device recovery.
- **Reporting:** Amount-only entries, multiple categories, multi-product entries, discounts/charges, uncategorized amounts, product recategorization, and summary-to-drill-down reconciliation.
- **Saving/recurrence:** Repeated taps, retries after partial failure, invalid amounts/dates, the same occurrence opened twice, short months, leap years, and missed periods.
- **Dates:** Device timezone differences, month/year boundaries, future-dated entries, and an app left open across midnight.
- **Offline/PWA/security:** Offline entry with photos, reconnect/retry, reload with a draft, an update while editing, and PIN/biometric lock flows when touching auth, sync, or storage.
- **New financial models:** Neutral transfers, partial refunds, historical budget limits, goal contributions without duplicate expenses, and migrations that preserve existing records.

## Assumptions and Boundaries

- This roadmap is documentation only. It changes no public APIs, database schemas, dependencies, or application behavior.
- Future schema changes need explicit Dexie migrations, backup compatibility checks, and sync compatibility assessment.
- Full-backup uploads remain distinct from two-way sync. Incremental synchronization requires a compatible backend; no backend implementation was included in this repository review.
- Current reminders depend on app-side checks. Reliable delivery while the app is closed requires separate platform/backend assessment; the service worker's push handler alone does not supply a sender or scheduler.
- Effort estimates express relative complexity. They are not calendar commitments, and optional integrations need their own design review before implementation.
