import { ref } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'

import { formatDateTimeForDB } from '@/utils/dateUtils'
import { db } from '@/db/dexie'

export const useContactStore = defineStore('contact', () => {
    const contacts = ref([])

    // Contacts are global
    liveQuery(() => db.contacts.toArray()).subscribe(data => contacts.value = data)

    async function addContact(name, phone) {
        return await db.contacts.add({
            name,
            phone,
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
    }

    async function updateContact(id, updates) {
        return await db.contacts.update(id, {
            ...updates,
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
    }

    async function deleteContact(id) {
        // Check if contact is used in any transactions
        const usageCount = await db.transactions
            .where('contact_id')
            .equals(id)
            .count()

        if (usageCount > 0) {
            throw new Error(`Cannot delete contact. It is being used in ${usageCount} transaction(s).`)
        }

        return await db.contacts.delete(id)
    }

    return {
        contacts,
        addContact,
        updateContact,
        deleteContact
    }
})
