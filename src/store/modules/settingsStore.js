import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db/dexie'

export const useSettingsStore = defineStore('settings', () => {
    const apiEndpoint = ref("")
    const apiToken = ref("")
    const initialized = ref(false)

    async function init() {
        if (initialized.value) return
        try {
            const endpoint = await db.settings.get("apiEndpoint")
            const token = await db.settings.get("apiToken")
            if (endpoint) apiEndpoint.value = endpoint.value
            if (token) apiToken.value = token.value
        } catch (e) {
            console.error("Failed to load settings", e)
        } finally {
            initialized.value = true
        }
    }

    async function saveSettings(endpoint, token) {
        try {
            await db.settings.put({ key: "apiEndpoint", value: endpoint })
            await db.settings.put({ key: "apiToken", value: token })
            apiEndpoint.value = endpoint
            apiToken.value = token
            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    return {
        apiEndpoint,
        apiToken,
        initialized,
        init,
        saveSettings
    }
})
