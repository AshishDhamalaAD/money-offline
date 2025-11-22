import { defineStore } from 'pinia'
import { db } from '../db'
import { liveQuery } from 'dexie'
import { ref } from 'vue'

export const useMasterStore = defineStore('master', () => {
    const categories = ref([])
    const contacts = ref([])
    const paymentModes = ref([])
    const products = ref([])

    // Live queries
    // Categories now depend on a selected book. We'll expose a function to set the book context or fetch by book.
    // For global settings, we might want all? Or just let the UI handle subscriptions.
    // Let's keep 'categories' as a ref that can be updated.

    // We'll remove the default global subscription for categories since it depends on book_id
    // liveQuery(() => db.categories.toArray()).subscribe(data => categories.value = data)

    liveQuery(() => db.contacts.toArray()).subscribe(data => contacts.value = data)
    liveQuery(() => db.payment_modes.toArray()).subscribe(data => paymentModes.value = data)
    liveQuery(() => db.products.toArray()).subscribe(data => products.value = data)

    // Categories
    let categorySubscription = null
    function watchCategories(bookId) {
        if (categorySubscription) categorySubscription.unsubscribe()
        if (!bookId) {
            categories.value = []
            return
        }
        categorySubscription = liveQuery(() =>
            db.categories.where('book_id').equals(bookId).toArray()
        ).subscribe(data => {
            categories.value = data
        })
    }

    async function addCategory(name, description, bookId) {
        return await db.categories.add({ name, description, book_id: bookId, sync_status: 'pending' })
    }
    async function deleteCategory(id) {
        return await db.categories.delete(id)
    }

    // Contacts
    async function addContact(name, phone) {
        return await db.contacts.add({ name, phone, sync_status: 'pending' })
    }
    async function deleteContact(id) {
        return await db.contacts.delete(id)
    }

    // Payment Modes
    async function addPaymentMode(name, type) {
        return await db.payment_modes.add({ name, type, sync_status: 'pending' })
    }
    async function deletePaymentMode(id) {
        return await db.payment_modes.delete(id)
    }

    // Products
    async function addProduct(name, rate, description) {
        return await db.products.add({ name, rate, description, sync_status: 'pending' })
    }
    async function updateProduct(id, updates) {
        return await db.products.update(id, { ...updates, sync_status: 'pending' })
    }
    async function deleteProduct(id) {
        return await db.products.delete(id)
    }

    // Initialize default data if empty
    async function initDefaults() {
        const count = await db.categories.count()
        if (count === 0) {
            await db.categories.bulkAdd([
                { name: 'Food', type: 'expense', sync_status: 'pending' },
                { name: 'Transport', type: 'expense', sync_status: 'pending' },
                { name: 'Salary', type: 'income', sync_status: 'pending' }
            ])
            await db.payment_modes.bulkAdd([
                { name: 'Cash', type: 'cash', sync_status: 'pending' },
                { name: 'Online', type: 'online', sync_status: 'pending' }
            ])
        }
    }

    return {
        categories,
        contacts,
        paymentModes,
        products,
        addCategory,
        deleteCategory,
        watchCategories,
        addContact,
        deleteContact,
        addPaymentMode,
        deletePaymentMode,
        addProduct,
        updateProduct,
        deleteProduct,
        initDefaults
    }
})
