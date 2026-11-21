import { withSyncLock } from '@/db/sync/lock'
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useLiveResource } from '@/composables/useLiveResource'
import { db } from '@/db/dexie'
import { recordDeletions } from '@/db/sync/dirty'
import { discardQueuedUploads } from '@/services/uploadQueue'
import { formatDateTimeForDB } from '@/utils/dateUtils'
import { getLastBookId, setLastBookId } from '@/utils/lastBook'

export const useBookStore = defineStore('book', () => {
    const resource = useLiveResource([], 'Could not load books.')
    const books = resource.data
    const { loading, error, ready, retry } = resource
    resource.start(() => db.books.orderBy('created_at').reverse().toArray())

    const sortedBooks = computed(() => {
        return [...books.value].sort((a, b) => a.id - b.id)
    });

    async function createBook(name) {
        const id = await db.books.add({
            name,
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
        return id
    }

    function deleteBook(id) {
        return withSyncLock(() => deleteBookLocked(id))
    }

    async function deleteBookLocked(id) {
        // Deleting a book removes its rows, so every removed row needs a
        // tombstone or other devices would keep showing it.
        const [transactions, categories, products, paymentModes, recurring, budgets] = await Promise.all([
            db.transactions.where('book_id').equals(id).primaryKeys(),
            db.categories.where('book_id').equals(id).primaryKeys(),
            db.products.where('book_id').equals(id).primaryKeys(),
            db.payment_modes.where('book_id').equals(id).primaryKeys(),
            db.recurring_transactions.where('book_id').equals(id).primaryKeys(),
            db.budgets.where('book_id').equals(id).primaryKeys(),
        ])

        await recordDeletions('transactions', transactions)
        await recordDeletions('categories', categories)
        await recordDeletions('products', products)
        await recordDeletions('payment_modes', paymentModes)
        await recordDeletions('recurring_transactions', recurring)
        await recordDeletions('budgets', budgets)
        await recordDeletions('books', id)

        // Photos still waiting for a connection belong to this book and would
        // otherwise upload into a book that no longer exists.
        const [transactionRows, productRows] = await Promise.all([
            db.transactions.where('book_id').equals(id).toArray(),
            db.products.where('book_id').equals(id).toArray(),
        ])
        const trashRows = await db.trash.where('book_id').equals(id).toArray()
        const queuedRows = await db.upload_queue.where('book_id').equals(id).toArray()
        await discardQueuedUploads([
            ...trashRows.flatMap(entry => entry.row.attachments || []),
            ...queuedRows.map(row => row.ref),
            ...transactionRows.flatMap(row => row.attachments || []),
            ...productRows.flatMap(row => row.attachments || []),
        ])

        await db.trash.where('book_id').equals(id).delete()
        await db.upload_queue.where('book_id').equals(id).delete()

        // Delete the book
        await db.books.delete(id)

        // Also delete related master data (transactions, categories, products, payment modes)
        await db.transactions.where('book_id').equals(id).delete()
        await db.categories.where('book_id').equals(id).delete()
        await db.products.where('book_id').equals(id).delete()
        await db.payment_modes.where('book_id').equals(id).delete()
        await db.recurring_transactions.where('book_id').equals(id).delete()
        await db.budgets.where('book_id').equals(id).delete()

        // Shortcuts must not point at a book that no longer exists
        if (getLastBookId() === id) {
            setLastBookId(null)
        }
    }

    async function getBook(id) {
        const book = await db.books.get(id)
        if (!book) throw new Error('This book is no longer available')
        return book
    }

    async function updateBook(id, updates) {
        await db.books.update(id, {
            ...updates,
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
    }

    return {
        books,
        loading, error, ready, retry,
        sortedBooks,
        createBook,
        deleteBook,
        getBook,
        updateBook
    }
})
