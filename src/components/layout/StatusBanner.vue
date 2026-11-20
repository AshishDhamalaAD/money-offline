<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { RouterLink } from "vue-router"

import { useSyncStore } from "@/store/syncStore"
import { useSettingsStore } from "@/store/settingsStore"
import { useBackupHealth } from "@/composables/useBackupHealth"
import { uploadQueueState } from "@/services/uploadQueue"
import IconSpinner from "@/assets/icons/IconSpinner.vue"

const syncStore = useSyncStore()
const settings = useSettingsStore()
const health = useBackupHealth()
const { online } = storeToRefs(syncStore)

const banner = ref(null)
const snoozing = ref(false)
const snoozeError = ref('')
let resizeObserver = null
let disposed = false

async function snooze(kind) {
  if (snoozing.value) return
  snoozing.value = true
  const result = await (kind === 'backup' ? settings.snoozeBackupReminder() : settings.snoozeStorageWarning())
  snoozeError.value = result.success ? '' : 'Could not save the reminder snooze. Try again.'
  snoozing.value = false
}

const photoLabel = computed(() => {
  const count = uploadQueueState.value.queued
  return count === 1 ? "1 photo" : `${count} photos`
})

const tone = computed(() => {
  if (!online.value) return "offline"
  if (uploadQueueState.value.failed > 0) return "error"
  return "busy"
})

const message = computed(() => {
  const queue = uploadQueueState.value

  if (!online.value) {
    return queue.queued > 0
      ? `Offline — ${photoLabel.value} saved, will upload when you reconnect.`
      : "Offline — changes are saved and will sync automatically."
  }

  if (queue.failed > 0 && queue.queued === 0) {
    const count = queue.failed === 1 ? "1 photo" : `${queue.failed} photos`
    return `${count} could not upload. Retry in Settings → Sync.`
  }

  if (queue.uploading) return `Uploading ${photoLabel.value}…`
  if (queue.queued > 0) return `${photoLabel.value} waiting to upload.`

  return ""
})

const visible = computed(() => Boolean(message.value) || health.backupDue || health.showStorageWarning)

const toneClasses = computed(() => {
  if (tone.value === "offline") {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-100"
  }
  if (tone.value === "error") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-100"
  }
  return "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-100"
})

// Sticky page headers park below this strip, so its height is published as a
// CSS variable instead of being hard-coded.
async function publishHeight() {
  await nextTick()
  if (disposed) return
  const height = visible.value && banner.value ? banner.value.offsetHeight : 0
  document.documentElement.style.setProperty("--status-banner-height", `${height}px`)
  // The strip already pads for the notch, so the header must not add it twice.
  document.documentElement.style.setProperty(
    "--status-banner-inset",
    visible.value ? "0px" : "env(safe-area-inset-top, 0px)",
  )
  window.dispatchEvent(new Event("status-banner-resize"))
}

watch([visible, message, () => health.backupDue, () => health.showStorageWarning], publishHeight)
watch(banner, (element, oldElement) => {
  if (oldElement) resizeObserver?.unobserve(oldElement)
  if (element) resizeObserver?.observe(element)
})

onMounted(() => {
  resizeObserver = new ResizeObserver(publishHeight)
  if (banner.value) resizeObserver.observe(banner.value)
  publishHeight()
})

onUnmounted(() => {
  disposed = true
  resizeObserver?.disconnect()
  document.documentElement.style.setProperty("--status-banner-height", "0px")
  document.documentElement.style.setProperty("--status-banner-inset", "env(safe-area-inset-top, 0px)")
  window.dispatchEvent(new Event("status-banner-resize"))
})
</script>

<template>
  <div
    v-if="visible"
    ref="banner"
    data-status-banner
    role="status"
    aria-live="polite"
    class="sticky top-0 z-40 bg-white text-center text-xs font-medium dark:bg-gray-900"
    style="padding-top: env(safe-area-inset-top, 0px)"
  >
    <div v-if="message" :class="['flex items-center justify-center gap-2 border-b px-4 py-1.5', toneClasses]">
      <IconSpinner v-if="tone === 'busy' && uploadQueueState.uploading" class="h-3.5 w-3.5 shrink-0" />
      <span v-else class="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true"></span>
      <span class="min-w-0 leading-snug">{{ message }}</span>
    </div>
    <div v-if="health.showStorageWarning" data-storage-warning class="space-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
      <p>Estimated site storage usage is at least 80% of its allowance.</p>
      <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <RouterLink to="/settings?tab=data" class="inline-flex min-h-11 items-center underline">View storage details</RouterLink>
        <button class="min-h-11 underline disabled:opacity-50" :disabled="snoozing" @click="snooze('storage')">Hide for 24 hours</button>
      </div>
    </div>
    <div v-if="health.backupDue" data-backup-reminder class="space-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
      <p>{{ settings.lastBackupGeneratedAt ? 'Your backup reminder is due.' : 'No backup is recorded on this device.' }}</p>
      <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <RouterLink to="/settings?tab=data" class="inline-flex min-h-11 items-center underline">Open backup settings</RouterLink>
        <button class="min-h-11 underline disabled:opacity-50" :disabled="snoozing" @click="snooze('backup')">Remind me tomorrow</button>
      </div>
    </div>
    <p v-if="snoozeError" role="alert" class="bg-red-50 px-4 py-2 text-red-800 dark:bg-red-900 dark:text-red-100">{{ snoozeError }}</p>
  </div>
</template>
