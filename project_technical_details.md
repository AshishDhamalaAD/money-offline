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
- **PWA**: `vite-plugin-pwa`

## 3. Project Structure

```
src/
├── assets/             # Static assets (images, icons, global styles)
├── components/         # Vue components
│   ├── common/         # Reusable UI components (BaseButton, BaseInput, etc.)
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
│   └── modules/        # Individual store modules
├── utils/              # Helper functions
├── App.vue             # Root component
└── main.js             # Application entry point
```

## 4. Database Schema (Dexie.js)

The application uses a versioned schema in `src/db/dexie.js`. The current version is **10**.

### Tables

- **books**: `++id, name, created_at, updated_at, sync_status`
- **transactions**: `++id, book_id, type, date, *category_ids, contact_id, payment_mode_id, discount, charge, amount, created_at, updated_at, sync_status, attachments`
- **categories**: `++id, name, book_id, description, sync_status, sort, created_at, updated_at`
- **contacts**: `++id, name, phone, sync_status, sort, created_at, updated_at`
- **payment_modes**: `++id, name, description, book_id, sync_status, created_at, updated_at`
- **products**: `++id, name, rate, description, quantity_type, book_id, category_id, sync_status, created_at, updated_at, attachments`
- **product_rates**: `++id, product_id, rate, created_at, updated_at` (History of rate changes)
- **settings**: `key, value` (Key-value store for app settings like API endpoint)

> **Note**: `*category_ids` indicates a multi-entry index, allowing efficient querying of transactions by multiple categories.

## 5. State Management (Pinia)

State is managed using Pinia stores with the Composition API pattern. Stores typically follow this flow:

1.  **Action**: Component calls a store action (e.g., `createTransaction`).
2.  **DB Update**: Store action updates Dexie.js.
3.  **Reactivity**: Store subscribes to Dexie `liveQuery` to automatically update state (`transactions.value`) when the database changes.
4.  **Sync Trigger**: Store action triggers the `syncStore` to push changes to the server.

### Key Stores

- `transactionStore`: Manages transactions, filtering, and stats.
- `productStore`: Manages products and rate history.
- `settingsStore`: Manages API configuration and sync settings.
- `syncStore`: Handles the synchronization process.

## 6. Data Synchronization

The synchronization logic is centralized in `src/store/modules/syncStore.js`.

- **Trigger**: Sync is triggered automatically after data modification (add/edit/delete) or manually via the Settings page.
- **Protocol**:
  1.  **Check Connectivity**: Verifies `navigator.onLine`.
  2.  **Authentication**: Retrieves `apiEndpoint` and `apiToken` from `settings` table.
  3.  **Data Dump**: Generates a full JSON dump of the database using `useDatabaseExport`.
  4.  **Push**: Sends the dump to `${apiEndpoint}/sync-app-data` via POST request.
- **Status**: Tracks `isSyncing`, `lastSyncTime`, and `error` state.

## 7. Routing

Routes are defined in `src/router/index.js` and use **Lazy Loading** for all pages to optimize initial load time.

- **Dashboard**: `/`
- **Book Details**: `/book/:id`
- **Settings**: `/settings` (and sub-routes for contacts, backup)
- **Book Settings**: `/book/:bookId/settings/...` (Products, Categories, Payment Modes)
- **Transaction Form**: `/book/:bookId/transaction/...` (Create/Edit)
- **Charts**: `/book/:bookId/charts`

## 8. Build & Deployment

- **Development**: `npm run dev` (starts Vite dev server)
- **Production Build**: `npm run build` (uses Vite to build for production)
- **Preview**: `npm run preview` (preview the production build locally)

### Configuration

- **Vite**: Configured with `@vitejs/plugin-vue` and `VitePWA`. Alias `@` maps to `./src`.
- **Tailwind**: Scans all source files for class usage.
