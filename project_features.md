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
- **Database Reset**: Option to completely wipe the local database and start fresh.

## 5. Security

Robust security features to protect your financial data.

- **Biometric Lock**: Secure the application with your device's native biometric authentication (Fingerprint, FaceID, TouchID) or screen lock (PIN/Pattern).
  - **Auto-Lock**: Automatically locks the app on startup.
  - **Local Authentication**: Uses the Web Authentication API (WebAuthn) for secure, local-only verification without sending biometric data to any server.

## 6. Analytics & Visualization

Visual tools to understand spending habits and financial trends.

- **Charts**: Dedicated charts page (`/book/:bookId/charts`) featuring:
  - **Monthly View**: Line chart showing outgoing transactions by month.
  - **Yearly View**: Line chart showing outgoing transactions by year.
  - **Date Filtering**: Filter chart data by specific date ranges.

## 7. Technical & Infrastructure

Built with modern web technologies for performance and reliability.

- **Offline-First Architecture**:
  - **Local Storage**: Uses **Dexie.js** (IndexedDB wrapper) to store all data locally on the device, ensuring full functionality without an internet connection.
  - **PWA (Progressive Web App)**: Installable on devices, capable of working offline, and provides an app-like experience.
- **Data Synchronization**:
  - **Server Sync**: Capability to sync local data with a backend server (`ServerSync` component).
  - **Sync Status**: Visual indicators for data synchronization state.
- **Backup & Restore**:
  - **Manual Import/Export**: Export data to a file for backup and import it back when needed.
  - **Auto-Backup**: Automated database backup functionality.

## 8. User Interface & Experience (UI/UX)

Polished interface for a premium user experience.

- **Dark Mode**: Full system-wide dark mode support for low-light environments.
- **Image Gallery**: Integrated **LightGallery** for viewing transaction attachments with zoom and swipe gestures.
- **Image Upload**: Seamless image uploading using **FilePond** with drag-and-drop support, image previews, and validation.
- **Toast Notifications**: Non-intrusive feedback messages for user actions (success, error).
- **Searchable Selects**: Enhanced dropdown menus with search functionality for quickly finding contacts, categories, or products.
- **Responsive Design**: Optimized for both desktop and mobile devices.
