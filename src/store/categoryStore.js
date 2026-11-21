import { defineStore } from 'pinia'
import { useLiveResource } from '@/composables/useLiveResource'

import { formatDateTimeForDB } from '@/utils/dateUtils'
import { db } from '@/db/dexie'
import { recordDeletions } from '@/db/sync/dirty'

export const useCategoryStore = defineStore('category', () => {
    const resource = useLiveResource([], 'Could not load categories.')
    const categories = resource.data
    const { loading, error, ready, retry } = resource

    function watchCategories(bookId) {
        resource.start(bookId ? async () => {
            const data = await db.categories.where('book_id').equals(bookId).toArray()
            return data.sort((a, b) => a.sort - b.sort)
        } : null, bookId)
    }

    async function addCategory(name, description, bookId) {
        return await db.categories.add({
            name,
            description,
            book_id: bookId,
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB(),
            sort: 999,
            sync_status: 'pending'
        })
    }

    async function deleteCategory(id) {
        // Check if category is used in any transactions
        const usageCount = await db.transactions
            .where('category_ids')
            .equals(id)
            .count()

        if (usageCount > 0) {
            throw new Error(`Cannot delete category. It is being used in ${usageCount} transaction(s).`)
        }

        // Check if category is used in any products
        const productUsageCount = await db.products
            .where('category_id')
            .equals(id)
            .count()

        if (productUsageCount > 0) {
            throw new Error(`Cannot delete category. It is being used by ${productUsageCount} product(s).`)
        }

        await recordDeletions('categories', id)
        return await db.categories.delete(id)
    }

    async function updateCategory(id, updates) {
        return await db.categories.update(id, {
            ...updates,
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
    }

    return {
        categories,
        loading, error, ready, retry,
        watchCategories,
        addCategory,
        deleteCategory,
        updateCategory
    }
})
