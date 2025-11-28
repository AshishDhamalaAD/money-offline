<script setup>
import { storeToRefs } from "pinia"

import { useSyncStore } from "@/store/modules/syncStore"
import IconSpinner from "@/assets/icons/IconSpinner.vue"

const syncStore = useSyncStore()
const { isSyncing } = storeToRefs(syncStore)
</script>

<template>
  <div v-if="isSyncing" class="flex items-center gap-2 text-sm text-gray-500">
    <IconSpinner />
    <span>Syncing...</span>
  </div>
</template>
