import { ref } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'

import { formatDateTimeForDB } from '@/utils/dateUtils'
import { db } from '@/db/dexie'

export const useCategoryStore = defineStore('category', () => {
    const categories = ref([])
    let categorySubscription = null

    function watchCategories(bookId) {
        if (categorySubscription) categorySubscription.unsubscribe()

        if (!bookId) {
            categories.value = []
            return
        }

        categorySubscription = liveQuery(() =>
            db.categories.where('book_id').equals(bookId).toArray()
        ).subscribe(data => categories.value = data.sort((a, b) => a.sort - b.sort))
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
        watchCategories,
        addCategory,
        deleteCategory,
        updateCategory
    }
})
