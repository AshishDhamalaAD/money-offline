<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { storeToRefs } from "pinia"

import { useSyncStore } from "@/store/syncStore"
import { useSettingsStore } from "@/store/settingsStore"
import { formatDateTime } from "@/utils/dateUtils"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import Toast from "@/components/common/BaseToast.vue"

const syncStore = useSyncStore()
const { isSyncing, pendingChanges, lastSyncTime, error, protocol, retryAt, online, backgroundSyncSupported, uploadQueueState } =
  storeToRefs(syncStore)
const settingsStore = useSettingsStore()
const { apiEndpoint, apiToken, syncMode } = storeToRefs(settingsStore)

const incrementalEnabled = computed(() => syncMode.value === "incremental")

const showToast = ref(false)
const toastMessage = ref("")
const toastType = ref("success")
const now = ref(Date.now())

let ticker = null

onMounted(async () => {
  await settingsStore.init()
  await syncStore.refreshPending()
  ticker = setInterval(() => (now.value = Date.now()), 1000)
})

onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})

const retrySeconds = computed(() => {
  if (!retryAt.value) return 0
  return Math.max(0, Math.ceil((retryAt.value - now.value) / 1000))
})

const protocolLabel = computed(() => {
  if (!incrementalEnabled.value) return "Full backup upload"
  if (protocol.value === "changes") return "Incremental sync"
  if (protocol.value === "dump") return "Full backup upload (fallback)"
  return "Not synced yet"
})

const protocolHint = computed(() => {
  if (!incrementalEnabled.value) {
    return "Each sync uploads the whole database as one compressed backup. Turn on incremental sync once your server supports it."
  }

  if (protocol.value === "dump") {
    return "Your server rejected the incremental endpoints, so full backups are used. Update the server, then switch incremental sync off and on again to retry."
  }

  return "Only changes made since the last sync are uploaded, and changes from other devices are pulled in."
})

const lastSyncLabel = computed(() => {
  if (!lastSyncTime.value) return "Never"
  return formatDateTime(lastSyncTime.value)
})

const pendingLabel = computed(() => {
  if (pendingChanges.value === 0) return "Everything is backed up"
  if (pendingChanges.value === 1) return "1 change waiting to sync"
  return `${pendingChanges.value} changes waiting to sync`
})

const photosLabel = computed(() => {
  const { queued, failed } = uploadQueueState.value
  if (failed > 0 && queued > 0) return `${queued} waiting, ${failed} failed`
  if (failed > 0) return failed === 1 ? "1 photo failed" : `${failed} photos failed`
  return queued === 1 ? "1 photo waiting to upload" : `${queued} photos waiting to upload`
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

async function toggleSyncMode() {
  if (isSyncing.value) return

  const next = incrementalEnabled.value ? "dump" : "incremental"
  const result = await settingsStore.setSyncMode(next)

  if (!result.success) {
    showToastMsg("Could not save the sync style.", "error")
    return
  }

  await syncStore.refreshPending()
  showToastMsg(
    next === "incremental" ? "Incremental sync enabled." : "Using full backups.",
    "success",
  )
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
    const parts = []
    if (result.pushed) parts.push(`${result.pushed} uploaded`)
    if (result.pulled) parts.push(`${result.pulled} pulled`)
    showToastMsg(parts.length ? `Sync successful — ${parts.join(", ")}.` : "Sync successful!", "success")
  } else {
    showToastMsg("Sync failed: " + result.message, "error")
  }
}

async function retryPhotos() {
  const result = await syncStore.retryUploads()

  if (result?.success) {
    showToastMsg("Photos uploaded and sync finished.", "success")
    return
  }

  if ((result?.failed || 0) > 0) {
    showToastMsg("Some photos still could not upload.", "error")
    return
  }

  showToastMsg(result?.uploaded ? "Photos uploaded." : "No photos were waiting.", "success")
}
</script>

<template>
  <div
    class="bg-white rounded-sm p-4 shadow-sm space-y-4 border border-gray-100 dark:bg-gray-900 dark:border-gray-800"
  >
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Server Sync</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Sync your data with a remote server</p>
      </div>

      <!-- Status -->
      <div class="rounded-sm bg-gray-50 p-3 ring-1 ring-gray-200 dark:bg-gray-950 dark:ring-gray-800">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ protocolLabel }}</span>
          <span
            :class="[
              'inline-flex items-center gap-1.5 text-xs font-medium',
              online ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
            ]"
          >
            <span
              :class="[
                'inline-block h-1.5 w-1.5 rounded-full',
                online ? 'bg-green-500' : 'bg-red-500',
              ]"
            ></span>
            {{ online ? "Online" : "Offline" }}
          </span>
        </div>

        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ protocolHint }}</p>

        <dl class="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <div class="flex justify-between gap-2">
            <dt>Pending</dt>
            <dd class="font-medium">{{ pendingLabel }}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt>Photos</dt>
            <dd class="font-medium">
              {{ uploadQueueState.queued > 0 || uploadQueueState.failed > 0 ? photosLabel : "None waiting" }}
            </dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt>Last sync</dt>
            <dd class="font-medium">{{ lastSyncLabel }}</dd>
          </div>
        </dl>

        <p v-if="uploadQueueState.failed > 0" class="mt-2 text-xs text-red-700 dark:text-red-400">
          A rejected upload usually means the token is wrong or the file is too large.
          <button
            type="button"
            class="font-medium underline underline-offset-2"
            :disabled="isSyncing"
            @click="retryPhotos"
          >
            Retry photo uploads
          </button>
        </p>

        <p
          v-else-if="uploadQueueState.queued > 0"
          class="mt-2 text-xs text-gray-500 dark:text-gray-400"
        >
          Photos are sent before your data, so a backup never contains an unfinished photo.
        </p>

        <p v-if="retrySeconds > 0" class="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Retrying in {{ retrySeconds }}s.
        </p>

        <p v-if="error" class="mt-2 text-xs text-red-700 dark:text-red-400">{{ error }}</p>

        <p v-if="!backgroundSyncSupported" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          This browser will retry when you next open the app.
        </p>
      </div>

      <!-- Sync style -->
      <div class="flex items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div class="space-y-1">
          <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">Incremental sync</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Upload only changed records and pull changes from other devices. Needs the newer server
            endpoints; leave it off to keep uploading the full backup.
          </p>
        </div>

        <button
          role="switch"
          :aria-checked="incrementalEnabled"
          @click="toggleSyncMode"
          :disabled="isSyncing"
          :class="[
            incrementalEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700',
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
            isSyncing ? 'opacity-50 cursor-not-allowed' : '',
          ]"
        >
          <span class="sr-only">Use incremental sync</span>
          <span
            aria-hidden="true"
            :class="[
              incrementalEnabled ? 'translate-x-5' : 'translate-x-0',
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-gray-300',
            ]"
          />
        </button>
      </div>

      <div class="grid gap-4">
        <BaseInput v-model="apiEndpoint" label="API Endpoint" placeholder="https://example.com" />
        <BaseInput v-model="apiToken" label="API Token" type="password" placeholder="Enter your API token" />
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ settingsStore.securityWarning || "Encrypted on this device." }}</p>
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
</template>
