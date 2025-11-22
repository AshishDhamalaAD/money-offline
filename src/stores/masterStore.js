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
        ).subscribe(data => categories.value = data)

        paymentModeSubscription = liveQuery(() =>
            db.payment_modes.where('book_id').equals(bookId).toArray()
        ).subscribe(data => paymentModes.value = data)

        productSubscription = liveQuery(() =>
            db.products.where('book_id').equals(bookId).toArray()
        ).subscribe(data => products.value = data)
    }

    // Categories
    async function addCategory(name, description, bookId) {
        return await db.categories.add({ name, description, book_id: bookId, sync_status: 'pending' })
    }
    async function deleteCategory(id) {
        return await db.categories.delete(id)
    }
    async function updateCategory(id, updates) {
        return await db.categories.update(id, { ...updates, sync_status: 'pending' })
    }

    // Contacts
    async function addContact(name, phone) {
        return await db.contacts.add({ name, phone, sync_status: 'pending' })
    }
    async function deleteContact(id) {
        return await db.contacts.delete(id)
    }

    // Payment Modes
    async function addPaymentMode(name, type, bookId) {
        return await db.payment_modes.add({ name, type, book_id: bookId, sync_status: 'pending' })
    }
    async function deletePaymentMode(id) {
        return await db.payment_modes.delete(id)
    }
    async function updatePaymentMode(id, updates) {
        return await db.payment_modes.update(id, { ...updates, sync_status: 'pending' })
    }

    // Products
    async function addProduct(name, rate, description, bookId) {
        return await db.products.add({ name, rate, description, book_id: bookId, sync_status: 'pending' })
    }
    async function updateProduct(id, updates) {
        return await db.products.update(id, { ...updates, sync_status: 'pending' })
    }
    async function deleteProduct(id) {
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
