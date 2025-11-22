import { defineStore } from 'pinia'
import { db } from '../db'
import { liveQuery } from 'dexie'
import { ref, computed } from 'vue'

export const useTransactionStore = defineStore('transaction', () => {
    const transactions = ref([])
    const currentBookId = ref(null)

    // Subscribe to transactions for the current book
    // We'll update this subscription when currentBookId changes
    let subscription = null

    function setBookId(bookId) {
        currentBookId.value = bookId
        if (subscription) subscription.unsubscribe()

        subscription = liveQuery(() =>
            db.transactions
                .where('book_id')
                .equals(bookId)
                .reverse()
                .sortBy('date')
        ).subscribe(data => {
            transactions.value = data
        })
    }

    async function createTransaction(transaction) {
        // transaction object should include:
        // type, date, amount, category_id, contact_id, payment_mode_id, description, products (array)
        // Convert to plain object to avoid DataCloneError with Vue reactive proxies
        const plainTransaction = JSON.parse(JSON.stringify(transaction))
        const id = await db.transactions.add({
            book_id: currentBookId.value, // Default to current
            ...plainTransaction,
            discount: plainTransaction.discount || 0,
            charge: plainTransaction.charge || 0,
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'pending'
        })
        return id
    }

    async function updateTransaction(id, updates) {
        const plainUpdates = JSON.parse(JSON.stringify(updates))
        await db.transactions.update(id, {
            ...plainUpdates,
            discount: plainUpdates.discount || 0,
            charge: plainUpdates.charge || 0,
            updated_at: new Date(),
            sync_status: 'pending'
        })
    }

    async function deleteTransaction(id) {
        await db.transactions.delete(id)
    }

    // Stats
    const stats = computed(() => {
        let totalIn = 0
        let totalOut = 0

        transactions.value.forEach(t => {
            const amount = parseFloat(t.amount) || 0
            if (t.type === 'in') totalIn += amount
            else if (t.type === 'out') totalOut += amount
        })

        return {
            totalIn,
            totalOut,
            netBalance: totalIn - totalOut
        }
    })

    // Filtering (Client-side for now as we load all transactions for a book)
    function getFilteredTransactions(filters) {
        // filters: { dateRange: 'today' | 'week' | 'month' | 'year' | 'custom', startDate, endDate, type, category }
        return transactions.value.filter(t => {
            let match = true
            const tDate = new Date(t.date)
            const now = new Date()

            // Set to start of day for accurate comparison
            now.setHours(0, 0, 0, 0)
            tDate.setHours(0, 0, 0, 0)

            if (filters.dateRange) {
                if (filters.dateRange === 'today') {
                    match = match && tDate.getTime() === now.getTime()
                } else if (filters.dateRange === 'yesterday') {
                    const yest = new Date(now)
                    yest.setDate(yest.getDate() - 1)
                    match = match && tDate.getTime() === yest.getTime()
                } else if (filters.dateRange === 'week') {
                    // Last 7 days including today
                    const weekAgo = new Date(now)
                    weekAgo.setDate(weekAgo.getDate() - 6) // 6 days ago + today = 7 days
                    match = match && tDate >= weekAgo && tDate <= now
                } else if (filters.dateRange === 'month') {
                    // Current month
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                    match = match && tDate >= monthStart && tDate <= monthEnd
                }
            }

            if (filters.type && filters.type !== 'all') {
                match = match && t.type === filters.type
            }

            return match
        })
    }

    return {
        transactions,
        currentBookId,
        setBookId,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        stats,
        getFilteredTransactions
    }
})
