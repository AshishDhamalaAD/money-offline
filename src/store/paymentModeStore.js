import { ref } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'

import { formatDateTimeForDB } from '@/utils/dateUtils'
import { db } from '@/db/dexie'

export const usePaymentModeStore = defineStore('paymentMode', () => {
    const paymentModes = ref([])
    let paymentModeSubscription = null

    function watchPaymentModes(bookId) {
        if (paymentModeSubscription) paymentModeSubscription.unsubscribe()

        if (!bookId) {
            paymentModes.value = []
            return
        }

        paymentModeSubscription = liveQuery(() =>
            db.payment_modes.where('book_id').equals(bookId).toArray()
        ).subscribe(data => paymentModes.value = data)
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
        watchPaymentModes,
        addPaymentMode,
        deletePaymentMode,
        updatePaymentMode
    }
})
