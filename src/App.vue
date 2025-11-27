<script setup>
import { onMounted } from "vue"
import { RouterView } from "vue-router"
import { useSettingsStore } from "./stores/settingsStore"
import { migrateImages } from "./utils/migration"

const settingsStore = useSettingsStore()

onMounted(async () => {
  await settingsStore.init()
  await migrateImages()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <RouterView />
  </div>
</template>
