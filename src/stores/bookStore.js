import { defineStore } from 'pinia'
import { db } from '../db'
import { liveQuery } from 'dexie'
import { ref, computed } from 'vue'
import { formatDateTimeForDB } from '../utils/dateUtils'

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
        await db.books.delete(id)
        // Also delete related transactions
        await db.transactions.where('book_id').equals(id).delete()
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
