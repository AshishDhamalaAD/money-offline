# Project Features

This document provides a crystal clear and detailed overview of the features implemented in the **Money** application.

## 1. Core Bookkeeping

The application is designed around the concept of "Books" (ledgers) to manage finances for different contexts (e.g., Personal, Business, Travel).

- **Multi-Book Management**: Users can create and switch between multiple independent books.
- **Dashboard**: A central hub providing an overview of the current book's financial status.

## 2. Transaction Management

Comprehensive tools for recording and managing financial transactions.

- **Record Transactions**: Support for both Income and Expense entries.
- **Detailed Entry Fields**:
  - **Date**: Transaction date.
  - **Amount**: Total transaction value.
  - **Category**: Classify transactions (e.g., Food, Transport) for better organization.
  - **Contact**: Associate transactions with specific people or entities (Payee/Payer).
  - **Payment Mode**: Specify the method of payment (e.g., Cash, Card, UPI).
  - **Discount & Charges**: Add specific adjustments to the final amount.
  - **Attachments**: Upload multiple images (receipts, bills) directly from the device. Photos taken offline stay on this device with immediate previews, including after reload, and upload before data sync when reconnected. The queue holds up to 20 photos / 40 MB; Sync settings show waiting/failed photos and Retry now.
- **Calculations**: Automatic computation of totals based on line items, discounts, and extra charges.

## 3. Inventory & Product Management

Manage items and services associated with transactions.

- **Product List**: Maintain a catalog of products or services.
- **Rate History**: Track the history of product rates over time (`/book/:bookId/products/:productId/history`).
- **Line Items**: Add multiple products to a single transaction entry.
- **Attachments**: Upload product images for better identification.

## 4. Data Management & Settings

Extensive configuration options to tailor the application to user needs.

- **Contact Management**: Create, edit, and manage a list of contacts (`/settings/contacts`).
- **Category Management**: Customize transaction categories (`/book/:bookId/settings/categories`).
- **Payment Modes**: Define and manage available payment methods (`/book/:bookId/settings/payment-modes`).
- **Theme Settings**: Appearance tab with Light / Dark / System options that persist per device.
- **Database Reset**: Option to completely wipe the local database and start fresh.

## 5. Security

Robust security features to protect your financial data.

- **Transaction Trash**: Restore deleted transactions from Book Settings for 30 days on this device, or delete them permanently. Trash shows items with quantity, rate and amount, plus categories, payment method, contact, description and receipt images when recorded. Labels are preserved at deletion; older entries resolve available references. Trash is excluded from backups and sync.
- **Safe Descriptions**: Legacy transaction HTML is shown as plain text in lists, charts, search and exports.
- **Security Locks**: Multiple layers of protection to secure your financial data.
  - **6-Digit PIN Lock**: Set a mandatory 6-digit PIN to secure the app. Supports dynamic light and dark modes. PINs are salted and hashed; five failed attempts trigger a persistent, escalating lockout.
  - **Biometric Lock**: Secure the application with your device's native biometric authentication (Fingerprint, FaceID, TouchID).
  - **Biometric Fallback**: If biometric authentication fails, users can automatically fall back to their 6-digit PIN for entry.
  - **Enforced Security**: Enabling Biometric lock automatically requires setting up a PIN to ensure constant access.
  - **Verification Flow**: Disabling either PIN or Biometric lock requires entering your current 6-digit PIN for verification.
  - **Polished Experience**: Smooth transition animations on successful authentication and refined UI elements (keys, icons) for a premium feel.
  - **Local Authentication**: Uses the Web Authentication API (WebAuthn) for secure, local-only verification without sending biometric data to any server.
  - **Auto-Lock**: Automatically locks the app on startup.
  - **Auto-Lock Timeout**: Configurable inactivity/background timeout (5, 10, 15, 20, 25, or 30 minutes) to automatically re-lock the app.

## 6. Analytics & Visualization

Visual tools to understand spending habits and financial trends.

- **Charts**: Dedicated charts page (`/book/:bookId/charts`) featuring:
  - **Monthly View**: Line chart showing outgoing transactions by month.
  - **Yearly View**: Line chart showing outgoing transactions by year.
  - **Comparison View**: Bar chart comparing monthly expenses year-over-year.
  - **Summary Tables**: Detailed product and category-wise summaries for the selected period.
  - **Interactive Drill-down**: Click on any category or product in the summary tables to open a detailed modal with per-transaction and per-line-item breakdowns (supports multi-product transactions).
  - **Enhanced Filtering**:
    - **Global Date Filter**: Quickly switch between common ranges (This Month, Last Year, etc.) or set custom dates.
    - **Advanced Filters**: Include/Exclude Categories and Products with multi-select pickers, plus transaction type toggles.
    - **Active Filter Chips**: Visual indicators for every include/exclude filter with instant tap-to-remove behavior.

## 7. Technical & Infrastructure

Built with modern web technologies for performance and reliability.

- **Offline-First Architecture**:
  - **Local Storage**: Uses **Dexie.js** (IndexedDB wrapper) to store all data locally on the device, ensuring full functionality without an internet connection.
  - **PWA (Progressive Web App)**: Installable on devices, capable of working offline, and provides an app-like experience.
- **Data Synchronization**:
  - **Server Sync**: Capability to sync local data with a backend server (`ServerSync` component).
  - **Bandwidth Optimization**: Data is compressed (GZIP) before uploading to ensure fast and efficient synchronization.
  - **Sync Status**: Visual indicators for data synchronization state.
- **Backup & Restore**:
  - **Manual Import/Export**: Export data to a file for backup and import it back when needed.
  - **Backup History**: Shows the last JSON backup generated on this device. Download initiation does not confirm that the file was saved. Receipt files, Trash, and device settings are not bundled.
  - **Backup Reminders**: Off by default, with 7-, 14-, and 30-day intervals. In-app reminders offer a 24-hour snooze; no recorded backup means an immediate reminder when enabled.
  - **Storage Health**: Shows estimated site storage usage where supported, with warnings at 80% in settings and across the unlocked app. Global warnings can be hidden for 24 hours.
  - **Persistent Storage**: Offers a browser persistence request with clear status. Persistence reduces automatic eviction risk and does not replace backups.

## 8. User Interface & Experience (UI/UX)

Polished interface for a premium user experience.

- **Dark Mode**: Full system-wide dark mode support for low-light environments.
- **Theme Preference**: Appearance settings let users force Light/Dark or follow the system theme with instant UI updates.
- **Image Gallery**: Integrated **LightGallery** for viewing transaction attachments with zoom and swipe gestures.
- **Image Upload**: Seamless image uploading using **FilePond** with drag-and-drop support, image previews, and validation.
- **Toast Notifications**: Non-intrusive feedback messages for user actions (success, error).
- **Searchable Selects**: Multi-select capable dropdowns with search, hidden selected options to prevent duplicates, and clear-all buttons for fast adjustments in forms and filters.
- **Responsive Design**: Optimized for both desktop and mobile devices.

- **Device secret storage**: API tokens are encrypted on secure origins using a device-local key. Non-secure contexts show a legacy-storage warning. App records are not encrypted by this feature.
- **Touch charts**: Larger tooltips and point hit areas make month/year charts easier to inspect on a phone.

### Accessibility and recovery feedback

- Shared dialogs, bottom sheets, attachment galleries, and lock overlays coordinate keyboard focus. Tab stays in the active dialog; Escape closes only its top dismissible layer. Closing restores focus, and background content stays inert until overlays close.
- Searchable selects support keyboard opening, arrow/Home/End navigation, Enter selection, Escape, and Tab. Shared fields associate labels, required state, and error descriptions with their inputs. Icon actions have names and visible focus indicators in both themes.
- Transactions offer keyboard-accessible Open and Actions buttons alongside gestures. Master-data rows and book navigation also have keyboard actions.
- Database read failures show persistent recovery actions instead of successful empty states or initial zero totals. Read retries preserve filters and pagination; failed refreshes label retained data as potentially outdated. Failed forms keep their input and explain a next action.
- Backup/reset and image deletion use app feedback and confirmations. Import success offers Reload app explicitly. Restore remains table-by-table: replacement failures may leave partial changes, and the message directs users to review records before retrying. This does not add atomic restore or a new backup format.
- Device settings must load before routed content and background services start. A failed initialization offers Retry and Reload app.
