import { defineStore } from 'pinia'
import { useLiveResource } from '@/composables/useLiveResource'

import { formatDateTimeForDB } from '@/utils/dateUtils'
import { addPeriod } from '@/utils/recurrence'
import { db } from '@/db/dexie'
import { recordDeletions } from '@/db/sync/dirty'

// IndexedDB cannot clone Vue proxies, including nested product/category arrays.
function toPlain(value) {
    return JSON.parse(JSON.stringify(value))
}

export const useRecurringStore = defineStore('recurring', () => {
    const resource = useLiveResource([], 'Could not load recurring transactions.')
    const rules = resource.data
    const { loading, error, ready, retry } = resource

    function watchRecurring(bookId) {
        resource.start(bookId ? async () => {
            const data = await db.recurring_transactions.where('book_id').equals(bookId).toArray()
            return data.sort((a, b) => String(a.next_due_date).localeCompare(String(b.next_due_date)))
        } : null, bookId)
    }

    async function addRule(rule, bookId) {
        return await db.recurring_transactions.add(toPlain({
            ...rule,
            book_id: bookId,
            active: rule.active === 0 ? 0 : 1,
            last_run_at: null,
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        }))
    }

    async function updateRule(id, updates) {
        return await db.recurring_transactions.update(id, toPlain({
            ...updates,
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        }))
    }

    async function deleteRule(id) {
        await recordDeletions('recurring_transactions', id)
        return await db.recurring_transactions.delete(id)
    }

    async function toggleRule(rule) {
        return await updateRule(rule.id, { active: rule.active ? 0 : 1 })
    }

    // Called after the user saves the prefilled transaction for a due period.
    // Moves the rule to the following period; if several periods were missed it
    // stays due, so each one is reviewed in turn.
    async function completeDue(ruleId, dueDate) {
        const rule = await db.recurring_transactions.get(ruleId)
        if (!rule) return null

        return await updateRule(ruleId, {
            next_due_date: addPeriod(dueDate, rule.frequency),
            last_run_at: formatDateTimeForDB()
        })
    }

    return {
        rules,
        loading, error, ready, retry,
        watchRecurring,
        addRule,
        updateRule,
        deleteRule,
        toggleRule,
        completeDue
    }
})
