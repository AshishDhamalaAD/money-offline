import { db } from '@/db/dexie'
import { formatDateTimeForDB } from "@/utils/dateUtils"

export function useDatabaseExport() {
    async function getDatabaseDump(onProgress) {
        const tables = ["books", "transactions", "categories", "contacts", "payment_modes", "products", "product_rates"]
        const exportData = {
            version: 5,
            exportDate: formatDateTimeForDB(),
            data: {},
        }

        const totalTables = tables.length

        for (let i = 0; i < tables.length; i++) {
            const tableName = tables[i]

            if (onProgress) {
                onProgress(Math.round(((i + 1) / totalTables) * 100))
            }

            const data = await db[tableName].toArray()
            exportData.data[tableName] = data

            // Small delay to show progress if needed, can be removed if not desired in sync
            // keeping it small or removing it for sync might be better, but let's keep it consistent for now
            // or maybe make it optional. For now, I'll remove the artificial delay here to make it pure logic.
            // The calling function can add delay if it wants to simulate progress or just rely on async nature.
        }

        return exportData
    }

    return {
        getDatabaseDump
    }
}
