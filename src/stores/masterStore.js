import { defineStore } from 'pinia'
import { db } from '../db'
import { liveQuery } from 'dexie'
import { ref } from 'vue'
import { formatDateTimeForDB, roundAmount } from '../utils/dateUtils'

export const useMasterStore = defineStore('master', () => {
    const categories = ref([])
    const contacts = ref([])
    const paymentModes = ref([])
    const products = ref([])

    // Live queries
    // Contacts are global
    liveQuery(() => db.contacts.toArray()).subscribe(data => contacts.value = data)

    // Categories, Payment Modes, Products are Book-specific
    let categorySubscription = null
    let paymentModeSubscription = null
    let productSubscription = null

    function watchBookData(bookId) {
        // Unsubscribe previous
        if (categorySubscription) categorySubscription.unsubscribe()
        if (paymentModeSubscription) paymentModeSubscription.unsubscribe()
        if (productSubscription) productSubscription.unsubscribe()

        if (!bookId) {
            categories.value = []
            paymentModes.value = []
            products.value = []
            return
        }

        // Subscribe new
        categorySubscription = liveQuery(() =>
            db.categories.where('book_id').equals(bookId).toArray()
        ).subscribe(data => categories.value = data.sort((a, b) => a.sort - b.sort))

        paymentModeSubscription = liveQuery(() =>
            db.payment_modes.where('book_id').equals(bookId).toArray()
        ).subscribe(data => paymentModes.value = data)

        productSubscription = liveQuery(() =>
            db.products.where('book_id').equals(bookId).toArray()
        ).subscribe(data => {
            products.value = data;
        })
    }

    // Categories
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

    // Contacts
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

    // Payment Modes
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

    // Products
    async function addProduct(name, rate, description, quantityType, bookId, categoryId) {
        return await db.products.add({
            name,
            rate: roundAmount(rate),
            description,
            quantity_type: quantityType,
            book_id: bookId,
            category_id: categoryId,
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
    }
    async function updateProduct(id, updates) {
        const updatedData = { ...updates }
        if (updatedData.rate !== undefined) {
            updatedData.rate = roundAmount(updatedData.rate)
        }
        return await db.products.update(id, {
            ...updatedData,
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })
    }
    async function deleteProduct(id) {
        // Check if product is used in any transaction line items
        const transactions = await db.transactions.toArray()
        let usageCount = 0

        for (const transaction of transactions) {
            if (transaction.products && Array.isArray(transaction.products)) {
                const hasProduct = transaction.products.some(item => item.product_id === id)
                if (hasProduct) usageCount++
            }
        }

        if (usageCount > 0) {
            throw new Error(`Cannot delete product. It is being used in ${usageCount} transaction(s).`)
        }

        return await db.products.delete(id)
    }

    // Initialize default data if empty - Keeping this simple for now, maybe not needed if we rely on user creation
    async function initDefaults() {
        // Defaults logic might need to change to be book-aware or just removed.
        // For now, leaving it as is but it might create items without book_id which won't show up.
        // Better to disable it or make it require a bookId.
        // Let's comment it out to avoid "ghost" items.
        /*
        const count = await db.categories.count()
        if (count === 0) {
            // ...
        }
        */
    }

    return {
        categories,
        contacts,
        paymentModes,
        products,
        watchBookData,
        addCategory,
        deleteCategory,
        updateCategory,
        addContact,
        updateContact,
        deleteContact,
        addPaymentMode,
        deletePaymentMode,
        updatePaymentMode,
        addProduct,
        updateProduct,
        deleteProduct,
        initDefaults
    }
})
