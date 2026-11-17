import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'

import { formatDateTimeForDB, roundAmount } from '@/utils/dateUtils'
import { db } from '@/db/dexie'
import { forgetDeletions, recordDeletions } from '@/db/sync/dirty'
import { useSyncStore } from '@/store/syncStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useProductStore } from '@/store/productStore'

// Full-range sentinels for the string dates stored as "YYYY-MM-DD HH:mm:ss".
const MIN_DATE = ""
const MAX_DATE = "\uffff"
const LIST_PAGE_SIZE = 50
const LIST_FILTER_KEYS = [
    "bookId",
    "startDate",
    "endDate",
    "type",
    "categoryId",
    "paymentModeId",
    "contactId",
    "productId",
    "search",
]

function dateBounds(startDate, endDate) {
    return [
        startDate ? `${startDate} 00:00:00` : MIN_DATE,
        endDate ? `${endDate} 23:59:59` : MAX_DATE,
    ]
}

function sameListFilters(a, b) {
    return LIST_FILTER_KEYS.every(key => (a[key] ?? "") === (b[key] ?? ""))
}

export const useTransactionStore = defineStore('transaction', () => {
    // Full book load. Charts need every row in memory to aggregate; the list
    // screen uses the paged query below instead.
    const transactions = ref([])
    const currentBookId = ref(null)
    const productStore = useProductStore()

    // Paged transaction list. Only the window the user has loaded is kept in
    // memory; date ranges and filters are evaluated inside Dexie.
    const listTransactions = ref([])
    const listLoading = ref(false)
    const listHasMore = ref(false)
    const listVersion = ref(0)

    let subscription = null
    let listSubscription = null
    let listFilters = null
    let listLimit = LIST_PAGE_SIZE

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

    // --- Paged list -------------------------------------------------------

    async function productMapFor(bookId) {
        const products = await db.products.where('book_id').equals(bookId).toArray()
        return new Map(products.map(product => [product.id, product]))
    }

    // The compound [book_id+date] index turns the book and date range into a
    // single key range, so Dexie only reads the rows inside the filter window.
    function listCollection(filters) {
        const [start, end] = dateBounds(filters.startDate, filters.endDate)

        return db.transactions
            .where('[book_id+date]')
            .between([filters.bookId, start], [filters.bookId, end], true, true)
    }

    function matchesListFilters(transaction, filters, productMap) {
        if (filters.type && filters.type !== 'all' && transaction.type !== filters.type) return false

        if (filters.categoryId) {
            const productCategoryIds = (transaction.products || [])
                .map(product => product.category_id)
                .filter(Boolean)
            const categoryIds = [...(transaction.category_ids || []), ...productCategoryIds]

            if (!categoryIds.includes(filters.categoryId)) return false
        }

        if (filters.paymentModeId && transaction.payment_mode_id !== filters.paymentModeId) return false
        if (filters.contactId && transaction.contact_id !== filters.contactId) return false
        if (
            filters.productId &&
            !(transaction.products || []).some(product => product.product_id === filters.productId)
        ) {
            return false
        }

        if (filters.search) {
            const query = filters.search.toLowerCase()
            const descriptionMatch = transaction.description?.toLowerCase().includes(query)
            const amountMatch = String(transaction.amount).includes(query)
            const productMatch = (transaction.products || []).some(product => {
                const name = product.name || productMap.get(product.product_id)?.name || ''
                return name.toLowerCase().includes(query)
            })

            if (!descriptionMatch && !amountMatch && !productMatch) return false
        }

        return true
    }

    function enrichTransactions(rows, productMap) {
        return rows.map(transaction => {
            if (!Array.isArray(transaction.products)) return transaction

            return {
                ...transaction,
                products: transaction.products.map(product => ({
                    ...product,
                    name: productMap.get(product.product_id)?.name || product.name || '',
                    attachments: productMap.get(product.product_id)?.attachments || []
                }))
            }
        })
    }

    async function fetchListWindow(filters, limit) {
        const productMap = await productMapFor(filters.bookId)

        // One extra row tells us whether another page exists without counting.
        const rows = await listCollection(filters)
            .filter(transaction => matchesListFilters(transaction, filters, productMap))
            .reverse()
            .limit(limit + 1)
            .toArray()

        return {
            rows: enrichTransactions(rows.slice(0, limit), productMap),
            hasMore: rows.length > limit
        }
    }

    function startListQuery() {
        listSubscription?.unsubscribe()

        const filters = listFilters
        const limit = listLimit

        listLoading.value = true
        listSubscription = liveQuery(() => fetchListWindow(filters, limit)).subscribe({
            next: ({ rows, hasMore }) => {
                listTransactions.value = rows
                listHasMore.value = hasMore
                listLoading.value = false
                listVersion.value += 1
            },
            error: error => {
                listLoading.value = false
                console.error('Failed to load transactions', error)
            }
        })
    }

    function openTransactionList(filters) {
        if (!filters?.bookId) return

        currentBookId.value = filters.bookId
        listFilters = { ...filters }
        listLimit = LIST_PAGE_SIZE
        startListQuery()
    }

    function setTransactionListFilters(filters) {
        if (!filters?.bookId) return
        if (listFilters && sameListFilters(listFilters, filters)) return

        listFilters = { ...filters }
        listLimit = LIST_PAGE_SIZE
        startListQuery()
    }

    function loadMoreTransactions() {
        if (!listFilters || !listHasMore.value) return

        listLimit += LIST_PAGE_SIZE
        startListQuery()
    }

    function closeTransactionList() {
        listSubscription?.unsubscribe()
        listSubscription = null
        listFilters = null
        listLimit = LIST_PAGE_SIZE
        listTransactions.value = []
        listHasMore.value = false
        listLoading.value = false
    }

    // Totals for the whole filter window, streamed row by row so the list can
    // show period stats without keeping every transaction in memory.
    async function getTransactionTotals(filters) {
        const productMap = filters.search ? await productMapFor(filters.bookId) : new Map()

        let totalIn = 0
        let totalOut = 0
        let count = 0

        await listCollection(filters)
            .filter(transaction => matchesListFilters(transaction, filters, productMap))
            .each(transaction => {
                const amount = parseFloat(transaction.amount) || 0
                if (transaction.type === 'in') totalIn += amount
                else if (transaction.type === 'out') totalOut += amount
                count += 1
            })

        return { totalIn, totalOut, netBalance: totalIn - totalOut, count }
    }

    // Net balance of everything before the filter start, used as the opening
    // balance for the stats panel.
    async function getBalanceBefore(bookId, date) {
        if (!bookId || !date) return 0

        let balance = 0

        await db.transactions
            .where('[book_id+date]')
            .between([bookId, MIN_DATE], [bookId, `${date} 00:00:00`], true, false)
            .each(transaction => {
                const amount = parseFloat(transaction.amount) || 0
                if (transaction.type === 'in') balance += amount
                else if (transaction.type === 'out') balance -= amount
            })

        return balance
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

        // Check for rate changes in products — update product master rate too
        if (products.length > 0) {
            for (const p of products) {
                if (p.product_id) {
                    const product = await db.products.get(p.product_id)
                    if (product && String(product.rate) !== String(p.rate)) {
                        await productStore.updateProduct(p.product_id, { rate: p.rate });
                    }
                }
            }
        }

        // Trigger background sync
        const syncStore = useSyncStore()
        syncStore.scheduleSync()

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
        syncStore.scheduleSync()
    }

    async function deleteTransaction(id) {
        const snapshot = await db.transactions.get(id)
        await recordDeletions('transactions', id)
        await db.transactions.delete(id)

        // Trigger background sync
        const syncStore = useSyncStore()
        syncStore.scheduleSync()

        // The raw row is returned so the list can offer an undo.
        return snapshot
    }

    async function deleteTransactions(ids) {
        if (!ids || ids.length === 0) return []

        const snapshots = await db.transactions.bulkGet(ids)
        await recordDeletions('transactions', ids)
        await db.transactions.bulkDelete(ids)

        // Trigger background sync
        const syncStore = useSyncStore()
        syncStore.scheduleSync()

        return snapshots.filter(Boolean)
    }

    async function restoreTransactions(rows) {
        if (!rows || rows.length === 0) return

        // Bulk put keeps the original ids, so an undo restores the exact rows.
        // They become pending again, and their tombstones must be dropped or the
        // next pull would delete them right back.
        const now = formatDateTimeForDB()
        const plainRows = JSON.parse(JSON.stringify(rows)).map(row => ({
            ...row,
            updated_at: now,
            sync_status: 'pending',
        }))

        await db.transactions.bulkPut(plainRows)
        await forgetDeletions('transactions', plainRows.map(row => row.id))

        // Trigger background sync
        const syncStore = useSyncStore()
        syncStore.scheduleSync()
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
        syncStore.scheduleSync()

        return id;
    }

    async function moveTransaction(transactionId, targetBookId) {
        // Copy first
        await copyTransaction(transactionId, targetBookId);
        // Then delete
        await deleteTransaction(transactionId);
    }

    async function duplicateTransaction(transactionId) {
        const sourceTx = await db.transactions.get(transactionId)
        if (!sourceTx) throw new Error('Transaction not found')

        // Strip fields not relevant for the new record; set date to now, clear description
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const dateLocal = `${year}-${month}-${day}T${hours}:${minutes}`

        // Strip enriched runtime fields (name, attachments) from product copies
        const products = (sourceTx.products || []).map(p => {
            const { name, attachments, ...rest } = p
            return rest
        })

        await createTransaction({
            type: sourceTx.type,
            date: dateLocal,
            amount: sourceTx.amount,
            category_ids: sourceTx.category_ids || [],
            payment_mode_id: sourceTx.payment_mode_id || '',
            contact_id: sourceTx.contact_id || '',
            description: '',
            products,
            discount: sourceTx.discount || 0,
            charge: sourceTx.charge || 0,
        })
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

    return {
        transactions,
        currentBookId,
        setBookId,
        listTransactions,
        listLoading,
        listHasMore,
        listVersion,
        openTransactionList,
        setTransactionListFilters,
        loadMoreTransactions,
        closeTransactionList,
        getTransactionTotals,
        getBalanceBefore,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        deleteTransactions,
        restoreTransactions,
        stats,
        copyTransaction,
        moveTransaction,
        duplicateTransaction
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
