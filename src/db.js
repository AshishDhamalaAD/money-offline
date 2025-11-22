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
});

db.version(3).stores({
    payment_modes: '++id, name, type, book_id, sync_status',
    products: '++id, name, rate, description, book_id, sync_status'
});
