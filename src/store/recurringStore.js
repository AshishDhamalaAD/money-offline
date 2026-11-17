import { ref } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'

import { formatDateTimeForDB } from '@/utils/dateUtils'
import { addPeriod } from '@/utils/recurrence'
import { db } from '@/db/dexie'
import { recordDeletions } from '@/db/sync/dirty'

export const useRecurringStore = defineStore('recurring', () => {
    const rules = ref([])
    let subscription = null

    function watchRecurring(bookId) {
        if (subscription) subscription.unsubscribe()

        if (!bookId) {
            rules.value = []
            return
        }

        subscription = liveQuery(() =>
            db.recurring_transactions.where('book_id').equals(bookId).toArray()
        ).subscribe(data => {
            rules.value = data.sort((a, b) => String(a.next_due_date).localeCompare(String(b.next_due_date)))
        })
    }

    // Forms pass reactive arrays (category_ids), which IndexedDB refuses to clone.
    const toPlain = (value) => JSON.parse(JSON.stringify(value))

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
        watchRecurring,
        addRule,
        updateRule,
        deleteRule,
        toggleRule,
        completeDue
    }
})
