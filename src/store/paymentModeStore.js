import { defineStore } from 'pinia'
import { useLiveResource } from '@/composables/useLiveResource'

import { formatDateTimeForDB } from '@/utils/dateUtils'
import { db } from '@/db/dexie'
import { recordDeletions } from '@/db/sync/dirty'

export const usePaymentModeStore = defineStore('paymentMode', () => {
    const resource = useLiveResource([], 'Could not load payment methods.')
    const paymentModes = resource.data
    const { loading, error, ready, retry } = resource

    function watchPaymentModes(bookId) {
        resource.start(bookId ? async () => {
            const data = await db.payment_modes.where('book_id').equals(bookId).toArray()
            return data
        } : null, bookId)
    }

    async function addPaymentMode(name, description, bookId) {
        return await db.payment_modes.add({
            name,
            description,
            book_id: bookId,
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
    }

    async function deletePaymentMode(id) {
        // Check if payment mode is used in any transactions
        const usageCount = await db.transactions
            .where('payment_mode_id')
            .equals(id)
            .count()

        if (usageCount > 0) {
            throw new Error(`Cannot delete payment mode. It is being used in ${usageCount} transaction(s).`)
        }

        await recordDeletions('payment_modes', id)
        return await db.payment_modes.delete(id)
    }

    async function updatePaymentMode(id, updates) {
        return await db.payment_modes.update(id, {
            ...updates,
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
    }

    return {
        paymentModes,
        loading, error, ready, retry,
        watchPaymentModes,
        addPaymentMode,
        deletePaymentMode,
        updatePaymentMode
    }
})
