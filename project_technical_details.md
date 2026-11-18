# Project Technical Details

This document provides a comprehensive technical overview of the **Money** application, intended for developers and technical stakeholders.

## 1. Architecture Overview

The application follows an **Offline-First** architecture, built as a **Progressive Web App (PWA)**.

- **Client-Side Storage**: The primary source of truth is the local IndexedDB database (managed via Dexie.js).
- **Reactivity**: The UI reacts to changes in the local database.
- **Synchronization**: Data is synchronized with a backend server via a custom sync protocol (Client Push).
- **PWA**: The app is installable and fully functional offline, using a service worker for asset caching.

## 2. Technology Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4 via `@tailwindcss/vite`)
- **Routing**: [Vue Router](https://router.vuejs.org/)
- **Charts**: [Chart.js](https://www.chartjs.org/) with `vue-chartjs` wrapper
- **Image Gallery**: [LightGallery](https://www.lightgalleryjs.com/)
- **Image Upload**: [FilePond](https://pqina.nl/filepond/) with `vue-filepond` adapter
- **PWA**: `vite-plugin-pwa`

## 3. Project Structure

```
src/
├── assets/             # Static assets (images, icons, global styles)
├── components/         # Vue components
│   ├── common/         # Reusable UI components (BaseButton, BaseInput, DateRangeTabs, ActiveFilterChips, etc.)
│   └── layout/         # Layout components (PageLayout, PageHeader)
├── composables/        # Shared logic (Composition API hooks)
├── constants/          # Application constants
├── db/                 # Database configuration and logic
│   ├── dexie.js        # Main database instance and schema definitions
│   ├── repositories/   # Data access layer (currently migrating)
│   └── sync/           # Sync logic
├── pages/              # Application views (mapped to routes)
├── router/             # Vue Router configuration
├── store/              # Pinia stores (state management)
│   └── bookStore.js    # Book store
├── utils/              # Helper functions
├── App.vue             # Root component
└── main.js             # Application entry point
```

## 4. Database Schema (Dexie.js)

The application uses a versioned schema in `src/db/dexie.js`. The current version is **16**.

### Tables

- **books**: `++id, name, created_at, updated_at, sync_status`
- **transactions**: `++id, book_id, type, date, *category_ids, contact_id, payment_mode_id, discount, charge, amount, created_at, updated_at, sync_status, attachments`
- **categories**: `++id, name, book_id, description, sync_status, sort, created_at, updated_at`
- **contacts**: `++id, name, phone, sync_status, sort, created_at, updated_at`
- **payment_modes**: `++id, name, description, book_id, sync_status, created_at, updated_at`
- **products**: `++id, name, rate, description, quantity_type, book_id, category_id, sync_status, created_at, updated_at, attachments`
- **product_rates**: `++id, product_id, rate, created_at, updated_at, sync_status` (History of rate changes)
- **settings**: `key, value` (Key-value store for app settings like API endpoint, themePreference, biometric flags)
- **sync_tombstones**: `++id, table, record_id, deleted_at, [table+record_id]` (Local deletions waiting to be pushed)
- **sync_state**: `key` (Pull cursor, client id, protocol choice and retry state)
- **upload_queue**: `++id, ref, book_id, status, created_at` (Device-local compressed photo blobs and resolution records; version 14, book index added in version 16)
- **trash**: `++id, table, book_id, deleted_at, [table+record_id]` (Device-local deleted transaction snapshots; version 16)

> **Note**: `*category_ids` indicates a multi-entry index, allowing efficient querying of transactions by multiple categories.

## 5. State Management (Pinia)

State is managed using Pinia stores with the Composition API pattern. Stores typically follow this flow:

1.  **Action**: Component calls a store action (e.g., `createTransaction`).
2.  **DB Update**: Store action updates Dexie.js.
3.  **Reactivity**: Store subscribes to Dexie `liveQuery` to automatically update state (`transactions.value`) when the database changes.
4.  **Sync Trigger**: Dexie change hooks notify the `syncStore`, which schedules a debounced sync.

### Key Stores

- `transactionStore`: Manages transactions, filtering, and stats.
- `productStore`: Manages products and rate history.
- `settingsStore`: Manages API configuration and sync settings.
- `syncStore`: Handles the synchronization process.

## 6. Data Synchronization

The engine lives in `src/db/sync/` and is driven by `src/store/syncStore.js`.

- **Sync style**: Settings offers a switch between the original **full backup upload** and **incremental sync**. Full backup is the default, so a server that only implements `POST ${apiEndpoint}/sync-app-data` is never probed for the newer endpoints. Incremental is opt-in once the backend implements the changes endpoints described below. The choice is stored as `syncMode` in the `settings` table.
- **Trigger**: Writes to any synced table are picked up by Dexie hooks, which schedule a debounced sync (2.5 s). A sync also runs on app start when something is pending or the last sync is older than 15 minutes, when connectivity returns, when the app becomes visible again, on pull-to-refresh, from the Settings button, and when the service worker asks for one.
- **Dirty flags**: Every synced row carries `sync_status`. Stores write `pending` on create and update; the engine clears it to `synced` only after the server accepts the row.
- **Deletions**: A deleted row leaves a `sync_tombstones` entry (`table`, `record_id`, `deleted_at`) so the removal can be pushed. Undo removes the matching tombstone.
- **Protocol** (incremental, only when selected in Settings):
  1.  **Pull**: `GET ${apiEndpoint}/sync-app-data/changes?since=<cursor>` with `X-TOKEN` and `X-SYNC-CLIENT`, returning `{ serverTime, hasMore, changes: { table: [rows] }, deletions: { table: [{ id, deleted_at }] } }`.
  2.  **Merge**: Remote rows are applied when their `updated_at` is newer than the local copy; a local edit newer than a remote delete wins and is pushed again. Conflicts are last-writer-wins on the timestamp. Merged rows are stored as `synced`.
  3.  **Push**: `POST ${apiEndpoint}/sync-app-data/changes` with `{ clientId, pushedAt, changes, deletions }`, in batches of 200 rows. A 2xx means the batch was stored; the client then clears those dirty flags and tombstones.
  4.  **Cursor**: The server's `serverTime` is stored in `sync_state` and sent as `since` on the next pull.
- **Fallback**: In incremental mode, a server that answers `404`, `405` or `501` on the changes endpoint — or answers `200` with something that is not a changes payload, such as an HTML app shell — is remembered as `dump`, and sync continues as a GZIP-compressed full database dump POSTed to `${apiEndpoint}/sync-app-data`. Switching incremental sync off and on again clears that memory and probes the changes endpoint once more.
- **Retries**: Network errors, timeouts, `408`, `429` and `5xx` retry with backoff (2 s, 10 s, 30 s, 2 min, 5 min). `4xx` responses stop retrying until the next manual sync. Attempts and the next retry time persist in `sync_state`.
- **Background Sync**: After a failure the app registers the `money-sync` tag. The service worker listens for that event and messages open windows to run the sync; browsers without the API retry when the app is next opened or comes online. iOS Safari does not support Background Sync.
- **Status**: Tracks `isSyncing`, `lastSyncTime`, `error`, `pendingChanges`, `protocol`, `retryAt` and `online`.

## 7. Image Uploads

Image uploads are handled separately from the main database sync to ensure efficiency.

- **Component**: `ImageUpload.vue` uses **FilePond** for handling file selection, validation (size, type), and previews. FilePond and its preview plugin are the heaviest third-party chunk in the app, so every screen mounts the widget through `LazyImageUpload.vue`: the component is an async import and is only fetched when the uploader scrolls into view (or when the "Add New Product" modal opens). Pages that never show an uploader, and forms where the user never scrolls to it, do not load that chunk at all.
- **Service**: `uploadService.js` handles the API communication.
- **Process**:
  1.  **Validation**: Checks file type (JPG/PNG), and size (<20MB). The limit is generous because the next step shrinks the image before it leaves the device.
  2.  **Compression**: `utils/imageCompression.js` redraws the file on a canvas with its long edge capped at 1600 px and re-encodes it as JPEG at quality 0.8. PNGs keep their format only when they actually contain transparency. Files under 250 KB, animated/vector formats, and anything that fails to decode (for example HEIC) are uploaded untouched, and a result that is not smaller than the original is discarded. Both the camera button and FilePond go through this path, so a 6 MB phone photo typically uploads as a few hundred kilobytes.
  3.  **Direct Upload**: Images are uploaded immediately to `${apiEndpoint}/upload-image` via POST.
  4.  **Storage**: The server returns the image URL, which is then stored in the `attachments` array of the respective product or transaction in IndexedDB.
  5.  **Deletion**: Deleting an image removes the URL from the local database. No delete request is sent to the server (preserves server-side history/backups).

## 8. Security & Authentication

### Security Locks

The application implements a multi-layered security system consisting of Biometric (WebAuthn) and 6-digit PIN authentication.

- **Storage (Dexie settings table)**:
  - `pinEnabled`: (Boolean) Whether PIN lock is active.
  - `pinHash`: Salt, iteration count and PBKDF2-SHA256 hash (210,000 iterations, random 16-byte salt).
  - `pinLockout`: Failed-attempt count, escalation level and expiry timestamp. Five failures lock for 30 seconds, doubling to five minutes; success resets the state.
  - `apiTokenEnc`: AES-GCM ciphertext and random 12-byte IV.
  - `tokenKey`: Non-extractable 256-bit CryptoKey stored in IndexedDB.
  - `autoLockTimeout`: (Number) Timeout in minutes for auto-locking (0 = startup only).
  - `biometricEnabled`: (Boolean) Whether biometric lock is active.
  - `biometricCredentialId`: (String) WebAuthn credential ID.
- **Rules**:
  - PIN is the primary fallback for biometrics.
  - Enabling Biometric lock **requires** the PIN lock to be enabled first.
  - Disabling PIN or Biometric lock requires verification of the current PIN.
- **Biometric Flow (WebAuthn)**:
  - Uses `navigator.credentials.create()` for registration and `navigator.credentials.get()` for verification.
  - Biometric data never leaves the device; only cryptographic proofs are used.
- **PIN Flow**:
  - `PinLock.vue` handles the numeric keyboard input and validation.
  - Supports dynamic light/dark modes and uses a custom iOS-style delete icon.
- **Polished Experience**:
  - Both lock components include a 400ms scale/opacity transition upon successful authentication to provide visual feedback before entry.
- **Auto-Lock Logic**:
  - `App.vue` listens for user activity events (`mousemove`, `mousedown`, `keypress`, `scroll`, `touchstart`).
  - It also listens for `visibilitychange` to detect background states.
  - A periodic check (every 10s) compares the current time with the `lastActive` timestamp.
  - If the elapsed time exceeds the `autoLockTimeout`, `lockApp()` is called.
- **Integration Flow (`App.vue`)**:
  - On startup, the app checks for lock settings.
  - If `biometricEnabled` is true, it shows `BiometricLock.vue`.
  - If `biometricEnabled` is false but `pinEnabled` is true, it shows `PinLock.vue`.
  - `BiometricLock.vue` includes a "Unlock with PIN" fallback option.

## 9. Routing

Routes are defined in `src/router/index.js` and use **Lazy Loading** for all pages to optimize initial load time.

- **Dashboard**: `/`
- **Book Details**: `/book/:id`
- **Settings**: `/settings` (and sub-routes for contacts, backup)
- **Book Settings**: `/book/:bookId/settings/...` (Products, Categories, Payment Modes)
- **Transaction Form**: `/book/:bookId/transaction/...` (Create/Edit)
- **Charts**: `/book/:bookId/charts`

## 10. Build & Deployment

- **Development**: `npm run dev` (starts Vite dev server)
- **Production Build**: `npm run build` (uses Vite to build for production)
- **Preview**: `npm run preview` (preview the production build locally)

### Configuration

- **Vite**: Configured with `@vitejs/plugin-vue` and `VitePWA`. Alias `@` maps to `./src`.
- **Tailwind**: Scans all source files for class usage.

## 11. Date Handling, Filtering & Drill-down

To ensure consistency across the application, date logic is centralized:

- **DateRangeTabs Component**: Encapsulates the logic for calculating date ranges (e.g., "This Month", "Last Year"). It emits standardized `startDate` and `endDate` strings (YYYY-MM-DD) to consumer components.
- **Month / Year Browser**: On the transactions list, selecting the **All** chip reveals a second row (`components/common/PeriodNavigator.vue`) with a segmented **All | Month | Year** control on the left and a `‹ September 2026 ›` stepper on the right. It opens on **All**, so the chip keeps its old all-time behaviour; Month and Year are one tap further. The label between the arrows is a native `<select>` listing every month (or year) from the book's first record up to the current month, newest first, so an old period is one tap away instead of dozens of arrow presses. That range is the bound: future periods and anything before the first entry are not offered, and the arrows disable at both ends. The page turns the choice into `periodRange` (first–last day of the month, or 1 January–31 December) and feeds it into the same Dexie window as the preset chips, so the rows, month groups, totals and opening balance all follow the visible period. The bounds come from `getBookDateBounds` in the transaction store and are re-read whenever the list changes.
- **Filter URL State**: The list mirrors its state into the query string (`filter`, `startDate`, `endDate`, `period`, `periodAnchor`, plus advanced filters and search) so a reload or a back/forward step restores the same view. The component snapshots `route.query` during setup (`initialQuery`) before reading it in `onMounted`, because the URL-sync watcher flushes first and would otherwise hand back the rewritten query.
- **Locale & Nepal time**: `src/utils/locale.js` holds reactive `appLocale` (`en-IN` default, plus `en-US` and `ne-NP`) and `calendarSystem` (`ad` or `bs`). Both persist in the Dexie `settings` table (`locale`, `calendarSystem`) and are loaded by `settingsStore.init()`. `formatCurrency`, `formatDate`, `formatDateTime`, `formatTime`, `formatMonthYear`, `formatMonthShort` and `getMonthKey` read the refs at call time, so a settings change re-renders open views. Amounts never carry a currency symbol by design. Chrome's `ne-NP` Intl data falls back to English Gregorian month names, so `dateUtils.js` carries its own Nepali Gregorian month table for AD display. `getNepalDate` uses `Intl.DateTimeFormat` with `timeZone: "Asia/Kathmandu"` and returns a Date whose local fields are Nepal wall-clock time; new and duplicated transactions, preset date chips, dashboard month/week summaries, period bounds and recurring due dates use it, so a device set to another time zone still opens on the Nepal calendar day.
- **Bikram Sambat display**: `src/utils/bikramSambat.js` converts AD to BS from a bundled 2000–2090 BS month-length table (no dependency). When enabled, `formatDate`/`formatDateTime`/`formatMonthYear` render BS, and the transaction list groups months by BS month so a BS month is not split at an AD boundary. Month and weekday names follow the locale (English transliteration or Nepali), and BS digits switch to Devanagari for `ne-NP`. Entry, filters, URL state and storage remain Gregorian; the switch is display-only.
- **Filtering Utility**: `filterByDateRange` (in `src/utils/dateUtils.js`) is used by charts and tables to filter data arrays based on the provided date range.
- **Chart Filters**: Advanced filters support include/exclude category and product IDs with separate temp/applied states; chips in the charts header remove filters instantly while keeping the filter form in sync.
- **Drill-down Interaction**:
  - **TransactionListModal**: Reusable modal (`src/pages/book-charts/TransactionListModal.vue`) that flattens transactions (including multi-product entries) into display rows with per-line amounts and category labels.
  - **Integration**: Triggered from category/product summary rows; reuses `BaseTable` for consistent rendering, sorting, and pagination.
- **Lazy Rendering**: Heavy chart components are wrapped in `LazyRender.vue` with `IntersectionObserver` to improve initial page load performance.

## 12. Theming & Appearance

- **Theme Preference**: Stored in Dexie `settings` table (`themePreference`) with options `light`, `dark`, or `system` (default).
- **Resolution**: `settingsStore.resolveTheme` listens to `prefers-color-scheme` when set to `system`; `applyTheme` toggles the root `dark` class and `data-theme` attribute for Tailwind and component styling.
- **UI Surface**: Appearance tab in `Settings` hosts `ThemeSettings.vue`, allowing users to switch themes with immediate persistence and feedback.
- **Language & region**: the same tab hosts a locale select (`en-IN`, `en-US`, `ne-NP`) and a PIN-style switch for Bikram Sambat dates, with a live amount/date preview. Both save immediately to the `settings` table (`locale`, `calendarSystem`).

## 13. Data Export

The Settings → Import / Export tab offers CSV and PDF exports of transactions for one book or all books. JSON backup and restore remain in `DatabaseBackup.vue` and are unchanged.

- **UI**: `pages/settings/ExportData.vue` renders the same period chips as the transaction list (`DateRangeTabs`), a book selector ("All books" plus every book), a live row count, and a CSV and PDF row. Each format has a **Share** button (only when the browser can share files) and a **Download** button, plus a toast that reports the result. When the chosen period and book match no rows the count says so and both buttons are disabled.
- **Filters**: the period chips cover All, This Month, Last Month, Today, Yesterday, This Year, Last Year and a custom start/end date pair. Bounds are inclusive — the start day is read from `00:00:00` and the end day up to `23:59:59` — matching the transaction list. The PDF header shows the actual span of the exported rows, and the totals only include those rows.
- **Data collection**: `composables/useDataExport.js` reads transactions from Dexie — a single book through the `[book_id+date]` index, all books through the `date` index — applying the date range inside the query, then joins category, contact, payment-mode and product names from their tables so the files contain readable text instead of numeric ids. The count uses the same query, so it always matches the export.
- **CSV** (`utils/csvExport.js`): UTF-8 with a BOM so Excel detects the encoding, CRLF line endings, and RFC-style quoting for any value containing a comma, quote or newline. Columns: Date, Type, Book (all-books exports only), Category, Payment Mode, Contact, Description, Products, Discount, Charge, Amount. Money columns always carry two decimals.
- **PDF** (`utils/statementPdf.js`): no PDF library is bundled. Each A4 page is drawn on a canvas with the system font — so Devanagari and other scripts the phone can display render correctly — and embedded as a JPEG in a hand-written PDF. Page one carries the book name, period, generation time and income/expense/net totals; long exports continue on further pages with a repeated table header and "Statement (continued)". Amounts and dates follow the locale and BS display setting. The trade-off is that the text is an image and therefore not selectable.
- **Sharing**: when `navigator.canShare({ files })` accepts the generated `File`, the Share button calls `navigator.share` so the file goes straight into WhatsApp, Mail, Drive or Files. A cancelled share is treated as a no-op; any other failure (including a platform that refuses the gesture) falls back to a normal download so the export is never lost. Browsers without file sharing see only the Download button.

## 14. UI Components

- **BaseSearchableSelect**: Supports multi-select, hides already selected options by default to prevent duplicates, provides search + limit handling, and exposes a clear-all button for quick resets (used in filters and forms).
- **BaseTable**: Provides search, sorting, pagination, and an exposed `resetPage()` helper so parents can reset pagination after filter changes (e.g., transaction drill-down modal).

## 12. Offline attachments, descriptions and Trash

- The upload service compresses offline photos into upload_queue and returns a local reference.
  A reactive reference-to-object-URL map is hydrated before mount, so thumbnails survive reload.
  Network failures fall back to the queue; rejected uploads are surfaced rather than retried forever.
- The single-flight queue runs before sync, on startup and reconnection. It rewrites transaction,
  product and Trash attachments atomically when an upload succeeds. Completed resolution rows stay
  for up to 24 hours (at most 100) to resolve forms still holding local references. It reconciles
  completed rows on subsequent runs to recover interrupted or late form saves.
- Queue caps are checked transactionally: 20 active/failed photos and 40 MB. Discard strips references
  before removing a blob. Book deletion purges that book's uploads, including photos in Trash.
- StatusBanner publishes its height for sticky PageHeader positioning; SyncIndicator and Sync
  settings report queued/failed uploads and offer manual retry. Data sync is deferred while records
  contain local references. The engine also checks the actual payload before sending.
- Descriptions use safe Vue interpolation and descriptionToText for legacy block markup, line
  breaks and entities. Search, CSV/PDF export and editing use the same helper. Version 15 rewrites
  existing descriptions with change tracking suspended and leaves sync status unchanged.
- Transaction deletion atomically saves a Trash snapshot and tombstone before deleting the active
  record. Trash is local, transactions-only and retained for 30 days, with expiry purged at startup
  and when opening Trash. Restore drops the snapshot and marks the row pending. Unsent
  deletion tombstones are removed when the original ID is restored; uncertain deletes remain queued
  when a fresh ID is assigned.
  Original IDs are reused only before deletion has been attempted; after sync or an uncertain
  network response a new ID avoids relying on server support for recreating deleted identities.
- A shared lock serializes sync, queue processing, Trash mutations and book deletion; Web Locks
  extends it across tabs. Trash/queue/settings are excluded from exported backups and SYNC_TABLES.
  The original compressed full-backup protocol remains the default with no server changes.

## 13. Secret migration and security scope

secureStore migrates plaintext PIN/token settings idempotently from settings initialization and lazy
token reads. PBKDF2 comparison uses a constant-time byte comparison. AES-GCM uses a random IV for each
changed token; unchanged tokens are not re-encrypted on Save. Sync configuration, the sync engine and
upload transport all decrypt through getApiToken. The PIN keypad disables during verification and
persisted lockouts, with a countdown. Secrets and the encryption key stay out of backups.

Without crypto.subtle (for example non-HTTPS hosting), new secrets retain legacy plaintext storage
with a visible warning instead of silently breaking synchronization. Existing encrypted secrets need
a secure origin. This protects against casual database/backup inspection; same-origin code can use
the device key and read financial data. It does not encrypt transaction records or replace OS disk
encryption and app locking.

Browser regression checks run with npm run test:browser in a fresh Chrome profile on an isolated
localhost origin. Set CHROME_PATH when Chrome is installed outside the default macOS location.
