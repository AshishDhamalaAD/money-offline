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

db.version(4).stores({
    payment_modes: '++id, name, description, book_id, sync_status', // Removed type, added description
    products: '++id, name, rate, description, quantity_type, book_id, sync_status' // Added quantity_type
});

db.version(5).stores({
    transactions: '++id, book_id, type, date, category_id, contact_id, payment_mode_id, discount, charge, sync_status' // Added discount, charge
});

db.version(6).stores({
    categories: '++id, name, book_id, description, sync_status, created_at, updated_at',
    payment_modes: '++id, name, type, book_id, sync_status, created_at, updated_at',
    contacts: '++id, name, phone, sync_status, created_at, updated_at',
    products: '++id, name, rate, description, quantity_type, book_id, category_id, sync_status, created_at, updated_at', // Added category_id
    transactions: '++id, book_id, type, date, category_id, contact_id, payment_mode_id, discount, charge, amount, created_at, updated_at, sync_status' // Added amount, created_at, updated_at
});

db.version(7).stores({
    transactions: '++id, book_id, type, date, *category_ids, contact_id, payment_mode_id, discount, charge, amount, created_at, updated_at, sync_status' // Changed category_id to *category_ids
});

db.version(8).stores({
    settings: 'key, value',
    categories: '++id, name, book_id, description, sync_status, sort, created_at, updated_at',
    contacts: '++id, name, phone, sync_status, sort, created_at, updated_at'
});

db.version(9).stores({
    products: '++id, name, rate, description, quantity_type, book_id, category_id, sync_status, created_at, updated_at, attachments',
    transactions: '++id, book_id, type, date, *category_ids, contact_id, payment_mode_id, discount, charge, amount, created_at, updated_at, sync_status, attachments'
});

db.version(10).stores({
    product_rates: '++id, product_id, rate, created_at, updated_at'
});

db.version(11).stores({
    recurring_transactions: '++id, book_id, active, next_due_date, sync_status',
    budgets: '++id, book_id, category_id, sync_status'
});

db.version(12).stores({
    // Compound index so a book's transactions can be read by date range
    // instead of loading the whole book into memory.
    transactions: '++id, book_id, type, date, *category_ids, contact_id, payment_mode_id, discount, charge, amount, created_at, updated_at, sync_status, attachments, [book_id+date]'
});

db.version(13).stores({
    // Sync bookkeeping. Tombstones remember local deletions so they can be
    // pushed to the server, and sync_state holds the cursor, client id and
    // retry information between sessions.
    sync_tombstones: '++id, table, record_id, deleted_at, [table+record_id]',
    sync_state: 'key',
    product_rates: '++id, product_id, rate, created_at, updated_at, sync_status'
}).upgrade(tx => {
    // Rate history written before this version has no sync status; treat it as
    // already backed up instead of queueing the whole history at once.
    return tx.table('product_rates').toCollection().modify(rate => {
        if (!rate.sync_status) rate.sync_status = 'synced'
    })
});
