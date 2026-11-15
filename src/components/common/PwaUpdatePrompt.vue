<script setup>
import { computed, onBeforeUnmount, ref } from "vue"
import { useRegisterSW } from "virtual:pwa-register/vue"

// Check for a new deployment periodically while the app stays open.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

let updateTimer = null
const dismissed = ref(false)

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(swUrl, registration) {
    if (!registration) return

    updateTimer = window.setInterval(() => {
      if (!navigator.onLine) return
      registration.update()
    }, UPDATE_CHECK_INTERVAL_MS)
  },
  onRegisterError(error) {
    console.error("Service worker registration failed:", error)
  },
})

const showUpdate = computed(() => needRefresh.value && !dismissed.value)
const showOfflineReady = computed(() => offlineReady.value && !dismissed.value)

async function reload() {
  await updateServiceWorker(true)
}

function dismiss() {
  dismissed.value = true
  offlineReady.value = false
  needRefresh.value = false
}

onBeforeUnmount(() => {
  if (updateTimer) window.clearInterval(updateTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="showUpdate || showOfflineReady"
        class="fixed inset-x-0 bottom-0 z-50 px-4 pb-safe-4"
      >
        <div
          class="mx-auto flex max-w-md items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-white shadow-lg dark:bg-gray-800"
        >
          <p class="flex-1 text-sm font-medium">
            <template v-if="showUpdate">A new version is available.</template>
            <template v-else>Ready to work offline.</template>
          </p>

          <button
            v-if="showUpdate"
            @click="reload"
            class="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-indigo-500 active:bg-indigo-700"
          >
            Reload
          </button>
          <button
            @click="dismiss"
            class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10"
          >
            Later
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
