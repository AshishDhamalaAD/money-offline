<script setup>
import { ref, onMounted } from "vue"
import { storeToRefs } from "pinia"

import { useSyncStore } from "@/store/syncStore"
import { useSettingsStore } from "@/store/settingsStore"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import Toast from "@/components/common/BaseToast.vue"

const syncStore = useSyncStore()
const { isSyncing } = storeToRefs(syncStore)
const settingsStore = useSettingsStore()
const { apiEndpoint, apiToken } = storeToRefs(settingsStore)
// isSyncing is now from store
const showToast = ref(false)
const toastMessage = ref("")
const toastType = ref("success")

onMounted(async () => {
  await settingsStore.init()
})

function showToastMsg(msg, type = "success") {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
}

async function saveSettings() {
  const result = await settingsStore.saveSettings(apiEndpoint.value, apiToken.value)
  if (result.success) {
    showToastMsg("Settings saved successfully", "success")
  } else {
    showToastMsg("Failed to save settings: " + result.message, "error")
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
    <div
      class="bg-white rounded-sm p-4 shadow-sm space-y-4 border border-gray-100 dark:bg-gray-900 dark:border-gray-800"
    >
      <div class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Server Sync</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Sync your backup to a remote server</p>
        </div>

        <div class="grid gap-4">
          <BaseInput v-model="apiEndpoint" label="API Endpoint" placeholder="https://example.com" />
          <BaseInput v-model="apiToken" label="API Token" type="password" placeholder="Enter your API token" />
        </div>

        <div class="flex gap-3">
          <BaseButton @click="saveSettings" variant="secondary" size="sm"> Save Settings </BaseButton>
          <BaseButton @click="syncToServer" :disabled="isSyncing" size="sm" :loading="isSyncing">
            <span v-if="isSyncing">Syncing...</span>
            <span v-else>Sync Now</span>
          </BaseButton>
        </div>
      </div>

      <Toast :show="showToast" :message="toastMessage" :type="toastType" @close="showToast = false" />
    </div>
  </div>
</template>
