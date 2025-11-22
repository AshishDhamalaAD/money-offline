import Dexie from 'dexie';

export const db = new Dexie('ExpenseTrackerDB');

db.version(1).stores({
    books: '++id, name, created_at, updated_at, sync_status',
    transactions: '++id, book_id, type, date, category_id, contact_id, payment_mode_id, sync_status',
    categories: '++id, name, type, sync_status', // type: income/expense
    contacts: '++id, name, phone, sync_status',
    payment_modes: '++id, name, type, sync_status',
    products: '++id, name, rate, sync_status'
});

db.version(2).stores({
    categories: '++id, name, book_id, description, sync_status', // Removed type, added book_id, description
    products: '++id, name, rate, description, sync_status' // Added description
}).upgrade(tx => {
    // Migration logic if needed, but for local dev usually clearing DB is easier if schema changes drastically
    // We'll just let Dexie handle structural changes. 
    // Note: Existing categories without book_id might need handling if we want to keep them.
    // For now, we assume new schema takes over.
});
