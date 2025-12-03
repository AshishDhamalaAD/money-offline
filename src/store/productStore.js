import { ref } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'

import { formatDateTimeForDB, roundAmount } from '@/utils/dateUtils'
import { db } from '@/db/dexie'

export const useProductStore = defineStore('product', () => {
    const products = ref([])
    let productSubscription = null

    function watchProducts(bookId) {
        if (productSubscription) productSubscription.unsubscribe()

        if (!bookId) {
            products.value = []
            return
        }

        productSubscription = liveQuery(() =>
            db.products.where('book_id').equals(bookId).toArray()
        ).subscribe(data => {
            products.value = data;
        })
    }

    async function addProduct(name, rate, description, quantityType, bookId, categoryId, attachments = []) {
        const productId = await db.products.add({
            name,
            rate: roundAmount(rate),
            description,
            quantity_type: quantityType,
            book_id: bookId,
            category_id: categoryId,
            attachments,
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })

        addProductRate({
            product_id: productId,
            rate: roundAmount(rate),
        })

        return productId;
    }

    async function updateProduct(id, updates) {
        const updatedData = { ...updates }

        // Fetch current product to check for rate change
        const currentProduct = await db.products.get(id)

        if (updatedData.rate !== undefined) {
            updatedData.rate = roundAmount(updatedData.rate)
        }

        const result = await db.products.update(id, {
            ...updatedData,
            updated_at: formatDateTimeForDB(),
            sync_status: 'pending'
        })

        // Check if rate changed and add to history
        if (updatedData.rate !== undefined && currentProduct && String(currentProduct.rate) !== String(updatedData.rate)) {
            addProductRate({
                product_id: id,
                rate: updatedData.rate,
            })
        }

        return result
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

        const productRates = await db.product_rates
            .where('product_id')
            .equals(id)
            .toArray()

        for (const productRate of productRates) {
            await deleteProductRate(productRate.id)
        }

        return await db.products.delete(id)
    }

    // Product Rates
    async function getProductRates(productId) {
        return await db.product_rates
            .where('product_id')
            .equals(productId)
            .reverse()
            .sortBy('created_at')
    }

    async function addProductRate(rateData) {
        return await db.product_rates.add({
            ...rateData,
            rate: roundAmount(rateData.rate),
            created_at: formatDateTimeForDB(),
            updated_at: formatDateTimeForDB(),
        })
    }

    async function updateProductRate(id, updates) {
        const updatedData = { ...updates }
        if (updatedData.rate !== undefined) {
            updatedData.rate = roundAmount(updatedData.rate)
        }
        return await db.product_rates.update(id, {
            ...updatedData,
            updated_at: formatDateTimeForDB(),
        })
    }

    async function deleteProductRate(id) {
        return await db.product_rates.delete(id)
    }

    return {
        products,
        watchProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductRates,
        addProductRate,
        updateProductRate,
        deleteProductRate
    }
})
