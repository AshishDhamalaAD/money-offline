<script setup>
import { onMounted, ref, watch } from "vue"
import { RouterView } from "vue-router"

import { useSettingsStore } from "@/store/settingsStore"
import BiometricLock from "@/components/common/BiometricLock.vue"
import PinLock from "@/components/common/PinLock.vue"

const settingsStore = useSettingsStore()
const isLocked = ref(false)
const lockType = ref(null) // 'biometric' | 'pin'

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
    lockType.value = "biometric"
    isLocked.value = true
  } else if (settingsStore.pinEnabled) {
    lockType.value = "pin"
    isLocked.value = true
  }
})

function onUnlocked() {
  isLocked.value = false
  lockType.value = null
}

function switchToPin() {
  lockType.value = "pin"
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50 transition-colors">
    <template v-if="isLocked">
      <BiometricLock v-if="lockType === 'biometric'" @unlocked="onUnlocked" @use-pin="switchToPin" />
      <PinLock v-if="lockType === 'pin'" @unlocked="onUnlocked" />
    </template>
    <RouterView />
  </div>
</template>
