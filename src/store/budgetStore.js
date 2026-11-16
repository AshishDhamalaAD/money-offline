import { ref } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'

import { formatDateTimeForDB } from '@/utils/dateUtils'
import { db } from '@/db/dexie'

export const useBudgetStore = defineStore('budget', () => {
    const budgets = ref([])
    let subscription = null

    function watchBudgets(bookId) {
        if (subscription) subscription.unsubscribe()

        if (!bookId) {
            budgets.value = []
            return
        }

        subscription = liveQuery(() =>
            db.budgets.where('book_id').equals(bookId).toArray()
        ).subscribe(data => {
            budgets.value = data
        })
    }

    async function findBudget(bookId, categoryId) {
        return await db.budgets
            .where('book_id')
            .equals(bookId)
            .filter(budget => budget.category_id === categoryId)
            .first()
    }

    // One budget per category per book: saving again replaces the amount.
    async function addBudget(categoryId, amount, bookId) {
        const existing = await findBudget(bookId, categoryId)

        if (existing) {
            return await updateBudget(existing.id, { amount })
        }

        return await db.budgets.add({
            book_id: bookId,
            category_id: categoryId,
            amount,
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
    }

    async function updateBudget(id, updates) {
        return await db.budgets.update(id, {
            ...updates,
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
    }

    async function deleteBudget(id) {
        return await db.budgets.delete(id)
    }

    return {
        budgets,
        watchBudgets,
        findBudget,
        addBudget,
        updateBudget,
        deleteBudget
    }
})
