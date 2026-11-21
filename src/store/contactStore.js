import { defineStore } from 'pinia'
import { useLiveResource } from '@/composables/useLiveResource'

import { formatDateTimeForDB } from '@/utils/dateUtils'
import { db } from '@/db/dexie'
import { recordDeletions } from '@/db/sync/dirty'

export const useContactStore = defineStore('contact', () => {
    const resource = useLiveResource([], 'Could not load contacts.')
    const contacts = resource.data
    const { loading, error, ready, retry } = resource
    resource.start(() => db.contacts.toArray())

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

        await recordDeletions('contacts', id)
        return await db.contacts.delete(id)
    }

    return {
        contacts,
        loading, error, ready, retry,
        addContact,
        updateContact,
        deleteContact
    }
})
