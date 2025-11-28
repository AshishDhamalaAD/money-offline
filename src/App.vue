<script setup>
import { onMounted } from "vue"
import { RouterView } from "vue-router"

import { useSettingsStore } from "@/store/modules/settingsStore"

const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.init()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <RouterView />
  </div>
</template>
