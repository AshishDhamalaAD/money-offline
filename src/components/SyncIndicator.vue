<script setup>
import { useSyncStore } from "../stores/syncStore"
import { storeToRefs } from "pinia"
import IconSpinner from "./icons/IconSpinner.vue"

const syncStore = useSyncStore()
const { isSyncing } = storeToRefs(syncStore)
</script>

<template>
  <div v-if="isSyncing" class="flex items-center gap-2 text-sm text-gray-500">
    <IconSpinner />
    <span>Syncing...</span>
  </div>
</template>
