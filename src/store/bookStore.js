import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'
import { db } from '@/db/dexie'
import { recordDeletions } from '@/db/sync/dirty'
import { formatDateTimeForDB } from '@/utils/dateUtils'
import { getLastBookId, setLastBookId } from '@/utils/lastBook'

export const useBookStore = defineStore('book', () => {
    const books = ref([])

    // Live query to keep books in sync
    db.books.orderBy('created_at').reverse().toArray().then(data => {
        books.value = data
    })

    // Subscribe to changes
    liveQuery(() => db.books.orderBy('created_at').reverse().toArray()).subscribe(data => {
        books.value = data
    })

    const sortedBooks = computed(() => {
        return books.value.sort((a, b) => a.id - b.id)
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

    async function deleteBook(id) {
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
        return await db.books.get(id)
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
        sortedBooks,
        createBook,
        deleteBook,
        getBook,
        updateBook
    }
})
