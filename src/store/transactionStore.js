import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'

import { formatDateTimeForDB, roundAmount } from '@/utils/dateUtils'
import { db } from '@/db/dexie'
import { useSyncStore } from '@/store/syncStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useProductStore } from '@/store/productStore'

export const useTransactionStore = defineStore('transaction', () => {
    const transactions = ref([])
    const currentBookId = ref(null)
    const productStore = useProductStore()

    // Subscribe to transactions for the current book
    // We'll update this subscription when currentBookId changes
    let subscription = null

    function setBookId(bookId) {
        currentBookId.value = bookId
        if (subscription) subscription.unsubscribe()

        subscription = liveQuery(async () => {
            const settingsStore = useSettingsStore()
            await settingsStore.init()

            const txs = await db.transactions
                .where('book_id')
                .equals(bookId)
                .reverse()
                .sortBy('date')

            // Fetch all products for this book to populate names
            const products = await db.products.where('book_id').equals(bookId).toArray()

            const productMap = new Map(products.map(p => [p.id, p]))

            // Enrich transactions with product names
            return txs.map(tx => {
                if (tx.products && Array.isArray(tx.products)) {
                    tx.products = tx.products.map(p => ({
                        ...p,
                        name: productMap.get(p.product_id)?.name || p.name || '',
                        attachments: productMap.get(p.product_id)?.attachments || []
                    }))
                }
                return tx
            })
        }).subscribe(data => {
            transactions.value = data;
        })
    }

    async function createTransaction(transaction) {
        // transaction object should include:
        // type, date, amount, category_ids (array), contact_id, payment_mode_id, description, products (array)
        // Convert to plain object to avoid DataCloneError with Vue reactive proxies
        const plainTransaction = JSON.parse(JSON.stringify(transaction))

        // Convert date from datetime-local format to database format
        const transactionDate = plainTransaction.date ? formatDateTimeForDB(new Date(plainTransaction.date)) : formatDateTimeForDB()

        // Round all product amounts to 2 decimal places
        const products = plainTransaction.products?.map(p => ({
            ...p,
            rate: roundAmount(p.rate),
            amount: roundAmount(p.amount)
        })) || []

        const id = await db.transactions.add({
            book_id: currentBookId.value, // Default to current
            ...plainTransaction,
            date: transactionDate,
            products,
            amount: roundAmount(plainTransaction.amount),
            category_ids: plainTransaction.category_ids || [],
            discount: roundAmount(plainTransaction.discount || 0),
            charge: roundAmount(plainTransaction.charge || 0),
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })

        // Check for rate changes in products
        if (products.length > 0) {
            for (const p of products) {
                if (p.product_id) {
                    const product = await db.products.get(p.product_id)
                    if (product && String(product.rate) !== String(p.rate)) {
                        await productStore.addProductRate({
                            product_id: p.product_id,
                            rate: p.rate,
                        });
                    }
                }
            }
        }

        // Trigger background sync
        const syncStore = useSyncStore()
        syncStore.triggerSync()

        return id
    }

    async function updateTransaction(id, updates) {
        const plainUpdates = JSON.parse(JSON.stringify(updates))

        // Round all product amounts to 2 decimal places if products exist
        if (plainUpdates.products) {
            plainUpdates.products = plainUpdates.products.map(p => {
                delete p.name;
                delete p.attachments;

                return {
                    ...p,
                    rate: roundAmount(p.rate),
                    amount: roundAmount(p.amount)
                }
            })
        }

        // Convert date from datetime-local format to database format if present
        const updateData = {
            ...plainUpdates,
            amount: plainUpdates.amount ? roundAmount(plainUpdates.amount) : undefined,
            category_ids: plainUpdates.category_ids,
            discount: roundAmount(plainUpdates.discount || 0),
            charge: roundAmount(plainUpdates.charge || 0),
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        }

        if (plainUpdates.date) {
            updateData.date = formatDateTimeForDB(new Date(plainUpdates.date))
        }

        await db.transactions.update(id, updateData)

        // Check for rate changes in products if products were updated
        if (updateData.products) {
            for (const p of updateData.products) {
                if (p.product_id) {
                    const product = await db.products.get(p.product_id)
                    // Note: p.rate is already rounded above if it existed
                    if (product && String(product.rate) !== String(p.rate)) {
                        productStore.updateProduct(p.product_id, { rate: p.rate });
                    }
                }
            }
        }

        // Trigger background sync
        const syncStore = useSyncStore()
        syncStore.triggerSync()
    }

    async function deleteTransaction(id) {
        await db.transactions.delete(id)

        // Trigger background sync
        const syncStore = useSyncStore()
        syncStore.triggerSync()
    }

    async function copyTransaction(transactionId, targetBookId) {
        // 1. Fetch full source transaction
        const sourceTx = await db.transactions.get(transactionId);
        if (!sourceTx) throw new Error("Transaction not found");

        // 2. Resolve Payment Mode
        let targetPaymentModeId = null;
        if (sourceTx.payment_mode_id) {
            const sourcePaymentMode = await db.payment_modes.get(sourceTx.payment_mode_id);
            if (sourcePaymentMode) {
                targetPaymentModeId = await _ensurePaymentMode(sourcePaymentMode.name, targetBookId, sourcePaymentMode);
            }
        }

        // 3. Resolve Contact (Global or Book specific? Model says global but let's double check)
        // Contacts are global so we keep the same contact_id
        const targetContactId = sourceTx.contact_id;

        // 4. Resolve Categories (Array)
        const targetCategoryIds = [];
        const categoryMap = new Map(); // Map<SourceCatId, TargetCatId> for product references

        if (sourceTx.category_ids && sourceTx.category_ids.length > 0) {
            for (const catId of sourceTx.category_ids) {
                const sourceCat = await db.categories.get(catId);
                if (sourceCat) {
                    const targetCatId = await _ensureCategory(sourceCat.name, targetBookId, sourceCat);
                    targetCategoryIds.push(targetCatId);
                    categoryMap.set(catId, targetCatId);
                }
            }
        }

        // 5. Resolve Products
        const targetProducts = [];
        if (sourceTx.products && sourceTx.products.length > 0) {
            for (const p of sourceTx.products) {
                // p has product_id, name, rate, amount etc.
                let targetProductId = null;

                if (p.product_id) {
                    const sourceProduct = await db.products.get(p.product_id);
                    if (sourceProduct) {
                        // Resolve category for this product
                        let targetProductCategoryId = null;
                        if (sourceProduct.category_id) {
                            // Try to find mapped category first
                            if (categoryMap.has(sourceProduct.category_id)) {
                                targetProductCategoryId = categoryMap.get(sourceProduct.category_id);
                            } else {
                                // Fetch source category to get name
                                const sourceProdCat = await db.categories.get(sourceProduct.category_id);
                                if (sourceProdCat) {
                                    targetProductCategoryId = await _ensureCategory(sourceProdCat.name, targetBookId, sourceProdCat);
                                }
                            }
                        }

                        targetProductId = await _ensureProduct(sourceProduct.name, targetBookId, sourceProduct, targetProductCategoryId);
                    }
                }

                targetProducts.push({
                    ...p,
                    product_id: targetProductId,
                    // Remove attachment references if they are specific to file system/local (keeping simple for now)
                    attachments: []
                });
            }
        }

        // 6. Create new Transaction
        const newTx = {
            ...sourceTx,
            book_id: targetBookId,
            payment_mode_id: targetPaymentModeId,
            contact_id: targetContactId,
            category_ids: targetCategoryIds,
            products: targetProducts,
            // Reset IDs and Status
            id: undefined,
            sync_status: 'pending',
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB()
        };

        // Reuse createTransaction to handle proper adding and validation
        // But createTransaction expects a simplified object usually coming from form, 
        // passing fully formed object might need slight adjustment or we call db directly.
        // Let's call db directly to avoid 'createTransaction' side effects like rounding that are already done, 
        // though rounding again doesn't hurt. 
        // However, 'createTransaction' expects 'setBookId' to be the current book. 
        // Since we are copying TO another book, we can't rely on 'currentBookId' inside 'createTransaction'.

        // Manual Add:
        const id = await db.transactions.add(newTx);

        // Trigger Sync
        const syncStore = useSyncStore()
        syncStore.triggerSync()

        return id;
    }

    async function moveTransaction(transactionId, targetBookId) {
        // Copy first
        await copyTransaction(transactionId, targetBookId);
        // Then delete
        await deleteTransaction(transactionId);
    }

    // Stats
    const stats = computed(() => {
        let totalIn = 0
        let totalOut = 0

        transactions.value.forEach(t => {
            const amount = parseFloat(t.amount) || 0
            if (t.type === 'in') totalIn += amount
            else if (t.type === 'out') totalOut += amount
        })

        return {
            totalIn,
            totalOut,
            netBalance: totalIn - totalOut
        }
    })

    // Filtering (Client-side for now as we load all transactions for a book)
    function getFilteredTransactions(filters) {
        // filters: { dateRange: 'today' | 'yesterday' | 'week' | 'this-week' | 'last-week' | 'month' | 'last-month' | 'this-year' | 'last-year' | 'custom', startDate, endDate, type, category }
        return transactions.value.filter(t => {
            let match = true
            const tDate = new Date(t.date)
            const now = new Date()

            // Set to start of day for accurate comparison
            now.setHours(0, 0, 0, 0)
            tDate.setHours(0, 0, 0, 0)

            if (filters.dateRange) {
                if (filters.dateRange === 'today') {
                    match = match && tDate.getTime() === now.getTime()
                } else if (filters.dateRange === 'yesterday') {
                    const yest = new Date(now)
                    yest.setDate(yest.getDate() - 1)
                    match = match && tDate.getTime() === yest.getTime()
                } else if (filters.dateRange === 'week') {
                    // Last 7 days including today
                    const weekAgo = new Date(now)
                    weekAgo.setDate(weekAgo.getDate() - 6) // 6 days ago + today = 7 days
                    match = match && tDate >= weekAgo && tDate <= now
                } else if (filters.dateRange === 'this-week') {
                    // Current week (Monday to Sunday)
                    const dayOfWeek = now.getDay()
                    const monday = new Date(now)
                    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
                    const sunday = new Date(monday)
                    sunday.setDate(monday.getDate() + 6)
                    match = match && tDate >= monday && tDate <= sunday
                } else if (filters.dateRange === 'last-week') {
                    // Previous week (Monday to Sunday)
                    const dayOfWeek = now.getDay()
                    const lastMonday = new Date(now)
                    lastMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7)
                    const lastSunday = new Date(lastMonday)
                    lastSunday.setDate(lastMonday.getDate() + 6)
                    match = match && tDate >= lastMonday && tDate <= lastSunday
                } else if (filters.dateRange === 'month') {
                    // Current month
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                    match = match && tDate >= monthStart && tDate <= monthEnd
                } else if (filters.dateRange === 'last-month') {
                    // Previous month
                    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
                    match = match && tDate >= lastMonthStart && tDate <= lastMonthEnd
                } else if (filters.dateRange === 'this-year') {
                    // Current year
                    const yearStart = new Date(now.getFullYear(), 0, 1)
                    const yearEnd = new Date(now.getFullYear(), 11, 31)
                    match = match && tDate >= yearStart && tDate <= yearEnd
                } else if (filters.dateRange === 'last-year') {
                    // Previous year
                    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
                    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)
                    match = match && tDate >= lastYearStart && tDate <= lastYearEnd
                } else if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
                    // Custom date range
                    const startDate = new Date(filters.startDate)
                    const endDate = new Date(filters.endDate)
                    startDate.setHours(0, 0, 0, 0)
                    endDate.setHours(23, 59, 59, 999)
                    match = match && tDate >= startDate && tDate <= endDate
                }
            }

            if (filters.type && filters.type !== 'all') {
                match = match && t.type === filters.type
            }

            if (filters.category) {
                match = match && t.category_ids && t.category_ids.includes(filters.category)
            }

            return match
        })
    }

    return {
        transactions,
        currentBookId,
        setBookId,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        stats,
        getFilteredTransactions,
        copyTransaction,
        moveTransaction
    }
})

// Configuration for checking dependencies
async function _ensureCategory(name, targetBookId, sourceCategory) {
    if (!name) return null;
    const existing = await db.categories
        .where('book_id').equals(targetBookId)
        .and(c => c.name === name)
        .first();

    if (existing) return existing.id;

    // Create new
    const useCategoryStore = (await import('@/store/categoryStore')).useCategoryStore;
    const categoryStore = useCategoryStore();
    return await categoryStore.addCategory(name, sourceCategory?.description || '', targetBookId);
}

async function _ensurePaymentMode(name, targetBookId, sourcePaymentMode) {
    if (!name) return null;
    const existing = await db.payment_modes
        .where('book_id').equals(targetBookId)
        .and(p => p.name === name)
        .first();

    if (existing) return existing.id;

    // Create new
    const usePaymentModeStore = (await import('@/store/paymentModeStore')).usePaymentModeStore;
    const paymentModeStore = usePaymentModeStore();
    return await paymentModeStore.addPaymentMode(name, sourcePaymentMode?.description || '', targetBookId);
}

async function _ensureProduct(name, targetBookId, sourceProduct, targetCategoryId) {
    if (!name) return null;

    // Check if product exists in target book
    const existing = await db.products
        .where('book_id').equals(targetBookId)
        .and(p => p.name === name)
        .first();

    if (existing) {
        return existing.id;
    }

    // Create new product in target book
    const useProductStore = (await import('@/store/productStore')).useProductStore;
    const productStore = useProductStore();

    // We need to resolve the category for the product as well if it has one
    // But here we are passing the ALREADY resolved targetCategoryId from the caller

    const newId = await productStore.addProduct(
        sourceProduct.name,
        sourceProduct.rate,
        sourceProduct.description || '',
        sourceProduct.quantity_type || 6,
        targetBookId,
        targetCategoryId
    );
    return newId;
}
