<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"

import { useSyncStore } from "@/store/syncStore"
import { uploadQueueState } from "@/services/uploadQueue"
import IconSpinner from "@/assets/icons/IconSpinner.vue"

const syncStore = useSyncStore()
const { online } = storeToRefs(syncStore)

const banner = ref(null)

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

const visible = computed(() => Boolean(message.value))

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
  const height = visible.value && banner.value ? banner.value.offsetHeight : 0
  document.documentElement.style.setProperty("--status-banner-height", `${height}px`)
  // The strip already pads for the notch, so the header must not add it twice.
  document.documentElement.style.setProperty(
    "--status-banner-inset",
    visible.value ? "0px" : "env(safe-area-inset-top, 0px)",
  )
  window.dispatchEvent(new Event("status-banner-resize"))
}

watch([visible, message], publishHeight)

onMounted(publishHeight)

onUnmounted(() => {
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
    :class="[
      'sticky top-0 z-40 flex items-center justify-center gap-2 border-b px-4 pb-1.5 text-center text-xs font-medium',
      toneClasses,
    ]"
    style="padding-top: calc(0.375rem + env(safe-area-inset-top, 0px))"
  >
    <IconSpinner v-if="tone === 'busy' && uploadQueueState.uploading" class="h-3.5 w-3.5 shrink-0" />
    <span v-else class="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true"></span>
    <span class="min-w-0 leading-snug">{{ message }}</span>
  </div>
</template>
