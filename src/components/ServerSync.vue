<script setup>
import { ref, onMounted } from "vue"
import { db } from "../db"
import { useSyncStore } from "../stores/syncStore"
import { storeToRefs } from "pinia"
import BaseButton from "./ui/BaseButton.vue"
import BaseInput from "./ui/BaseInput.vue"
import Toast from "./ui/Toast.vue"

const syncStore = useSyncStore()
const { isSyncing } = storeToRefs(syncStore)

const apiEndpoint = ref("")
const apiToken = ref("")
// isSyncing is now from store
const showToast = ref(false)
const toastMessage = ref("")
const toastType = ref("success")

onMounted(async () => {
  try {
    const endpoint = await db.settings.get("apiEndpoint")
    const token = await db.settings.get("apiToken")
    if (endpoint) apiEndpoint.value = endpoint.value
    if (token) apiToken.value = token.value
  } catch (e) {
    console.error("Failed to load settings", e)
  }
})

function showToastMsg(msg, type = "success") {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
}

async function saveSettings() {
  try {
    await db.settings.put({ key: "apiEndpoint", value: apiEndpoint.value })
    await db.settings.put({ key: "apiToken", value: apiToken.value })
    showToastMsg("Settings saved successfully", "success")
  } catch (error) {
    showToastMsg("Failed to save settings: " + error.message, "error")
  }
}

async function syncToServer() {
  if (!apiEndpoint.value) {
    showToastMsg("Please configure API Endpoint first", "error")
    return
  }

  if (!navigator.onLine) {
    showToastMsg("No internet connection. Sync requires an active internet connection.", "error")
    return
  }

  const result = await syncStore.triggerSync()

  if (result.success) {
    showToastMsg("Sync successful!", "success")
  } else {
    showToastMsg("Sync failed: " + result.message, "error")
  }
}
</script>

<template>
  <div>
    <div class="bg-white rounded-sm p-4 shadow-sm space-y-4">
      <div class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-800">Server Sync</h2>
          <p class="text-sm text-gray-500">Sync your backup to a remote server</p>
        </div>

        <div class="grid gap-4">
          <BaseInput v-model="apiEndpoint" label="API Endpoint" placeholder="https://example.com/api/sync" />
          <BaseInput v-model="apiToken" label="API Token" type="password" placeholder="Enter your API token" />
        </div>

        <div class="flex gap-3">
          <BaseButton @click="saveSettings" variant="secondary" size="sm"> Save Settings </BaseButton>
          <BaseButton @click="syncToServer" :disabled="isSyncing" size="sm">
            <span v-if="isSyncing" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Syncing...
            </span>
            <span v-else>Sync Now</span>
          </BaseButton>
        </div>
      </div>

      <Toast :show="showToast" :message="toastMessage" :type="toastType" @close="showToast = false" />
    </div>
  </div>
</template>
