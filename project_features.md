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
  - **Attachments**: Upload multiple images (receipts, bills) directly from the device. Supports offline queuing and management.
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

- **Security Locks**: Multiple layers of protection to secure your financial data.
  - **6-Digit PIN Lock**: Set a mandatory 6-digit PIN to secure the app. Supports dynamic light and dark modes.
  - **Biometric Lock**: Secure the application with your device's native biometric authentication (Fingerprint, FaceID, TouchID).
  - **Biometric Fallback**: If biometric authentication fails, users can automatically fall back to their 6-digit PIN for entry.
  - **Enforced Security**: Enabling Biometric lock automatically requires setting up a PIN to ensure constant access.
  - **Verification Flow**: Disabling either PIN or Biometric lock requires entering your current 6-digit PIN for verification.
  - **Polished Experience**: Smooth transition animations on successful authentication and refined UI elements (keys, icons) for a premium feel.
  - **Local Authentication**: Uses the Web Authentication API (WebAuthn) for secure, local-only verification without sending biometric data to any server.
  - **Auto-Lock**: Automatically locks the app on startup.

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
  - **Manual Import/Export**: Export data to a file for backup and import it back when needed.

## 8. User Interface & Experience (UI/UX)

Polished interface for a premium user experience.

- **Dark Mode**: Full system-wide dark mode support for low-light environments.
- **Theme Preference**: Appearance settings let users force Light/Dark or follow the system theme with instant UI updates.
- **Image Gallery**: Integrated **LightGallery** for viewing transaction attachments with zoom and swipe gestures.
- **Image Upload**: Seamless image uploading using **FilePond** with drag-and-drop support, image previews, and validation.
- **Toast Notifications**: Non-intrusive feedback messages for user actions (success, error).
- **Searchable Selects**: Multi-select capable dropdowns with search, hidden selected options to prevent duplicates, and clear-all buttons for fast adjustments in forms and filters.
- **Responsive Design**: Optimized for both desktop and mobile devices.
