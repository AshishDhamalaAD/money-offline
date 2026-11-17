<script setup>
import { storeToRefs } from "pinia"

import { useSyncStore } from "@/store/syncStore"
import IconSpinner from "@/assets/icons/IconSpinner.vue"

const syncStore = useSyncStore()
const { isSyncing, pendingChanges } = storeToRefs(syncStore)
</script>

<template>
  <div v-if="isSyncing" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
    <IconSpinner />
    <span>Syncing...</span>
  </div>
  <div
    v-else-if="pendingChanges > 0"
    class="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400"
  >
    <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"></span>
    <span>{{ pendingChanges }} to sync</span>
  </div>
</template>
