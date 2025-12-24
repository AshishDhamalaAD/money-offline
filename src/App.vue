<script setup>
import { onMounted, ref, watch } from "vue"
import { RouterView } from "vue-router"

import { useSettingsStore } from "@/store/settingsStore"
import BiometricLock from "@/components/common/BiometricLock.vue"
import PinLock from "@/components/common/PinLock.vue"

const settingsStore = useSettingsStore()
const isLocked = ref(false)
const lockType = ref(null) // 'biometric' | 'pin'
const lastActive = ref(Date.now())
const checkInterval = ref(null)

watch(
  () => settingsStore.themePreference,
  (preference) => {
    settingsStore.applyTheme(preference)
  },
  { immediate: true }
)

const updateActivity = () => {
  lastActive.value = Date.now()
}

const checkAutoLock = () => {
  if (isLocked.value || !settingsStore.initialized) return
  if (!settingsStore.pinEnabled && !settingsStore.biometricEnabled) return

  const timeoutMinutes = settingsStore.autoLockTimeout
  if (timeoutMinutes === 0) return // Only original startup lock, or immediate?
  // User said "unused for X minutes", so 0 might mean "only on startup" or "auto-lock disabled".
  // But usually 0 means immediate. I'll treat 0 as "Startup only" for now since they gave options 5-30.

  const elapsedMs = Date.now() - lastActive.value
  const timeoutMs = timeoutMinutes * 60 * 1000

  if (elapsedMs >= timeoutMs) {
    lockApp()
  }
}

const lockApp = () => {
  if (isLocked.value) return
  if (settingsStore.biometricEnabled) {
    lockType.value = "biometric"
    isLocked.value = true
  } else if (settingsStore.pinEnabled) {
    lockType.value = "pin"
    isLocked.value = true
  }
}

const onVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    checkAutoLock()
  } else {
    updateActivity()
  }
}

onMounted(async () => {
  await settingsStore.init()

  // Initial lock
  if (settingsStore.biometricEnabled || settingsStore.pinEnabled) {
    lockApp()
  }

  // Setup activity listeners
  window.addEventListener("mousemove", updateActivity)
  window.addEventListener("mousedown", updateActivity)
  window.addEventListener("keypress", updateActivity)
  window.addEventListener("scroll", updateActivity)
  window.addEventListener("touchstart", updateActivity)
  document.addEventListener("visibilitychange", onVisibilityChange)

  // Periodic check for inactivity while in foreground
  checkInterval.value = setInterval(checkAutoLock, 10000) // Check every 10 seconds
})

function onUnlocked() {
  isLocked.value = false
  lockType.value = null
  updateActivity()
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
