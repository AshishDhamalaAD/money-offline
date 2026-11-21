<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue"
import { RouterView, useRoute } from "vue-router"

import { useSettingsStore } from "@/store/settingsStore"
import { useSyncStore } from "@/store/syncStore"
import { useAppBadge } from "@/composables/useAppBadge"
import { useReminders } from "@/composables/useReminders"
import { useBackupHealth } from "@/composables/useBackupHealth"
import BaseError from "@/components/common/BaseError.vue"
import BiometricLock from "@/components/common/BiometricLock.vue"
import PinLock from "@/components/common/PinLock.vue"
import PwaUpdatePrompt from "@/components/common/PwaUpdatePrompt.vue"
import RecurringDuePrompt from "@/components/common/RecurringDuePrompt.vue"
import InstallPrompt from "@/components/common/InstallPrompt.vue"
import BottomNav from "@/components/layout/BottomNav.vue"
import StatusBanner from "@/components/layout/StatusBanner.vue"

const settingsStore = useSettingsStore()
const syncStore = useSyncStore()
const appBadge = useAppBadge()
const reminders = useReminders()
const backupHealth = useBackupHealth()
const route = useRoute()
let disposed = false
const appReady = ref(false)
const initializing = ref(false)
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

function reloadApp() { window.location.reload() }
async function initializeApp() {
  if (initializing.value || appReady.value) return
  initializing.value = true
  const loaded = await settingsStore.init()
  initializing.value = false
  if (!loaded || disposed) return

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

  // Home-screen badge and the optional daily reminder both track due recurring
  // entries, so they start with the app and react to live data changes.
  appBadge.start()
  reminders.start()
  backupHealth.start()

  // Watches local writes, flushes anything still pending and keeps the retry
  // timer alive across app opens.
  syncStore.start()
  appReady.value = true
}
onMounted(initializeApp)

onUnmounted(() => {
  disposed = true
  for (const name of ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']) window.removeEventListener(name, updateActivity)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  appBadge.stop()
  reminders.stop()
  backupHealth.stop()
  syncStore.stop()
  if (checkInterval.value) clearInterval(checkInterval.value)
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
    <main v-if="settingsStore.loadError" class="mx-auto max-w-lg space-y-4 p-6">
      <h1 class="text-xl font-semibold">Unable to open Money</h1>
      <BaseError :message="settingsStore.loadError" :busy="initializing" @retry="initializeApp">
        <button type="button" class="ml-3 rounded-sm px-2 py-1 font-semibold underline" @click="reloadApp">Reload app</button>
      </BaseError>
    </main>
    <p v-else-if="!appReady" role="status" class="p-6">Loading Money...</p>
    <StatusBanner v-if="appReady && !isLocked" />

    <template v-if="isLocked">
      <BiometricLock v-if="lockType === 'biometric'" @unlocked="onUnlocked" @use-pin="switchToPin" />
      <PinLock v-if="lockType === 'pin'" @unlocked="onUnlocked" />
    </template>
    <RouterView v-if="appReady" />

    <BottomNav v-if="appReady && route.meta.tab && !isLocked" />

    <RecurringDuePrompt v-if="appReady && !isLocked" />

    <InstallPrompt v-if="appReady && !isLocked" />

    <PwaUpdatePrompt v-if="appReady && !isLocked" />
  </div>
</template>
