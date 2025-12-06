<script setup>
import { onMounted, ref, watch } from "vue"
import { RouterView } from "vue-router"

import { useSettingsStore } from "@/store/settingsStore"
import BiometricLock from "@/components/common/BiometricLock.vue"

const settingsStore = useSettingsStore()
const isLocked = ref(false)

watch(
  () => settingsStore.themePreference,
  (preference) => {
    settingsStore.applyTheme(preference)
  },
  { immediate: true }
)

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
  <div class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50 transition-colors">
    <BiometricLock v-if="isLocked" @unlocked="onUnlocked" />
    <RouterView />
  </div>
</template>
