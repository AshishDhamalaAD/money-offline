import { db } from "../db"
import { PRODUCT_IMAGES, TRANSACTION_IMAGES } from "../constants"

export async function migrateImages() {
    try {
        // Check if migration has already run (optional, but good practice)
        // For now, we'll just check if the first item in constants has attachments in DB
        // Or we can just overwrite as requested "sync these images"

        // Migrate Product Images
        for (const [id, images] of Object.entries(PRODUCT_IMAGES)) {
            const productId = parseInt(id)
            const product = await db.products.get(productId)
            if (product) {
                // Only update if attachments are different or missing
                if (JSON.stringify(product.attachments) !== JSON.stringify(images)) {
                    await db.products.update(productId, { attachments: images })
                    console.log(`Migrated images for product ${productId}`)
                }
            }
        }

        // Migrate Transaction Images
        for (const [id, images] of Object.entries(TRANSACTION_IMAGES)) {
            const transactionId = parseInt(id)
            const transaction = await db.transactions.get(transactionId)
            if (transaction) {
                if (JSON.stringify(transaction.attachments) !== JSON.stringify(images)) {
                    await db.transactions.update(transactionId, { attachments: images })
                    console.log(`Migrated images for transaction ${transactionId}`)
                }
            }
        }

        console.log("Image migration completed")
    } catch (error) {
        console.error("Image migration failed:", error)
    }
}
