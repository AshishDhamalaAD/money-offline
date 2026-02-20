# Money Manager

A comprehensive offline-first personal finance manager built with Vue 3 and Dexie.js.

## Features

- **Offline-First**: All data is stored locally using Dexie.js (IndexedDB).
- **PWA**: Installable as a Progressive Web App with offline support.
- **Security**:
  - PIN Lock
  - Biometric Lock (Fingerprint/Face ID)
  - Auto-lock on inactivity
- **Transaction Management**:
  - Add, edit, delete transactions
  - Copy & Move transactions between books
  - Filter by date range, category, payment mode, contact, product
  - Search functionality
- **Book Management**:
  - Create and manage multiple books
  - Track total balance across all books
- **Categories**:
  - Manage custom categories
  - Auto-suggest categories based on transaction history
- **Contacts**:
  - Manage contacts
  - Auto-suggest contacts based on transaction history
- **Products**:
  - Manage products
  - Track product-wise expenses
- **Payment Modes**:
  - Manage payment modes
  - Auto-suggest payment modes based on transaction history
- **Reporting**:
  - Daily, weekly, monthly, yearly views
  - Category-wise spending analysis
  - Contact-wise spending analysis
  - Product-wise spending analysis
- **Settings**:
  - Configure PIN and Biometric lock
  - Set auto-lock timeout
  - Currency settings

## Tech Stack

- **Framework**: Vue 3
- **State Management**: Pinia
- **Routing**: Vue Router
- **Database**: Dexie.js (IndexedDB)
- **PWA**: vite-plugin-pwa
- **UI Components**:
  - Custom components with Tailwind CSS
  - FilePond for file uploads
  - Chart.js for visualizations
  - LightGallery for image gallery

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd money
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Build for production:

   ```bash
   npm run build
   ```

5. Deploy to production:
   ```bash
   vercel --prod
   ```

## Usage

- Access the app at `http://localhost:5173` (or the port specified by Vite).
- Use the "Install App" button in the browser to install the PWA.
- All data is stored locally in your browser's IndexedDB.

## License

[MIT](LICENSE)
