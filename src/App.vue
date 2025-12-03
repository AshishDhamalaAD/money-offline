<script setup>
import { onMounted, ref } from "vue"
import { RouterView } from "vue-router"

import { useSettingsStore } from "@/store/settingsStore"
import BiometricLock from "@/components/common/BiometricLock.vue"

const settingsStore = useSettingsStore()
const isLocked = ref(false)

onMounted(async () => {
  await settingsStore.init()
  if (settingsStore.biometricEnabled) {
    isLocked.value = true
  }
})

function onUnlocked() {
  isLocked.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <BiometricLock v-if="isLocked" @unlocked="onUnlocked" />
    <RouterView />
  </div>
</template>
