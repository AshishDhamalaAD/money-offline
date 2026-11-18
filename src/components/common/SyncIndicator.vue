<script setup>
import { storeToRefs } from "pinia"

import { useSyncStore } from "@/store/syncStore"
import IconSpinner from "@/assets/icons/IconSpinner.vue"

const syncStore = useSyncStore()
const { isSyncing, pendingChanges, uploadQueueState, online } = storeToRefs(syncStore)
</script>

<template>
  <div v-if="isSyncing" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
    <IconSpinner />
    <span>Syncing...</span>
  </div>
  <div
    v-else-if="uploadQueueState.failed > 0"
    class="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
  >
    <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-500"></span>
    <button type="button" :disabled="!online" class="min-h-11 text-left disabled:opacity-60" @click="syncStore.retryUploads()">{{ uploadQueueState.failed }} photo{{ uploadQueueState.failed === 1 ? "" : "s" }} failed<span v-if="online"> · Retry now</span></button>
  </div>
  <div
    v-else-if="uploadQueueState.queued > 0"
    class="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400"
  >
    <span class="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
    <span>{{ uploadQueueState.queued }} photo{{ uploadQueueState.queued === 1 ? "" : "s" }} to upload</span>
  </div>
  <div
    v-else-if="pendingChanges > 0"
    class="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400"
  >
    <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"></span>
    <span>{{ pendingChanges }} to sync</span>
  </div>
</template>
