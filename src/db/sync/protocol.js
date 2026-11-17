// Tables that take part in sync. `settings` is device-local configuration and
// stays out; product_rates is history that still needs to reach other devices.
export const SYNC_TABLES = [
    'books',
    'categories',
    'contacts',
    'payment_modes',
    'products',
    'product_rates',
    'transactions',
    'recurring_transactions',
    'budgets',
]

// Background Sync tag shared with the service worker.
export const BACKGROUND_SYNC_TAG = 'money-sync'

// How many rows are pushed in one request before the engine asks for more.
export const SYNC_BATCH_SIZE = 200

// Guards against a server that keeps reporting more pages forever.
export const SYNC_MAX_PAGES = 25

export const SYNC_TOKEN_HEADER = 'X-TOKEN'
export const SYNC_CLIENT_HEADER = 'X-SYNC-CLIENT'
