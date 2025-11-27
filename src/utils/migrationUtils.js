import { PRODUCT_PRICES } from "../constants"
import { db } from "../db"

export async function importProductRates() {
    let count = 0

    console.log('PRODUCT_PRICES', PRODUCT_PRICES.length)

    PRODUCT_PRICES.forEach(async (data) => {
        const productId = data.product_id
        const product = await db.products.get(productId)

        if (product) {
            await db.product_rates.add({
                product_id: productId,
                rate: data.rate,
                created_at: data.created_at,
                updated_at: data.updated_at
            })
            count++
        } else {
            console.log('product', productId, 'not found')
        }
    })

    console.log('count', count);

    return count
}
