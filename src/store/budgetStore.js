import { defineStore } from 'pinia'
import { useLiveResource } from '@/composables/useLiveResource'

import { formatDateTimeForDB } from '@/utils/dateUtils'
import { db } from '@/db/dexie'
import { recordDeletions } from '@/db/sync/dirty'

export const useBudgetStore = defineStore('budget', () => {
    const resource = useLiveResource([], 'Could not load budgets.')
    const budgets = resource.data
    const { loading, error, ready, retry } = resource

    function watchBudgets(bookId) {
        resource.start(bookId ? async () => {
            const data = await db.budgets.where('book_id').equals(bookId).toArray()
            return data
        } : null, bookId)
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
        await recordDeletions('budgets', id)
        return await db.budgets.delete(id)
    }

    return {
        budgets,
        loading, error, ready, retry,
        watchBudgets,
        findBudget,
        addBudget,
        updateBudget,
        deleteBudget
    }
})
