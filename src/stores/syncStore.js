import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import { useDatabaseExport } from '../composables/useDatabaseExport'

export const useSyncStore = defineStore('sync', () => {
    const isSyncing = ref(false)
    const lastSyncTime = ref(null)
    const error = ref(null)
    const { getDatabaseDump } = useDatabaseExport()

    async function triggerSync() {
        if (!navigator.onLine) {
            error.value = "No internet connection"
            return { success: false, message: "No internet connection" }
        }

        isSyncing.value = true
        error.value = null

        try {
            const endpoint = await db.settings.get("apiEndpoint")
            const token = await db.settings.get("apiToken")

            if (!endpoint || !endpoint.value) {
                throw new Error("API Endpoint not configured")
            }

            if (!token || !token.value) {
                throw new Error("API Token not configured")
            }

            const data = await getDatabaseDump()

            const response = await fetch(`${endpoint.value}/sync-app-data`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-TOKEN": token.value,
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status} ${response.statusText}`)
            }

            lastSyncTime.value = new Date()
            return { success: true }
        } catch (e) {
            console.error("Sync failed:", e)
            error.value = e.message
            return { success: false, message: e.message }
        } finally {
            isSyncing.value = false
        }
    }

    return {
        isSyncing,
        lastSyncTime,
        error,
        triggerSync
    }
})
