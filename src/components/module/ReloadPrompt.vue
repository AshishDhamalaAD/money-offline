<script setup>
import { useRegisterSW } from "virtual:pwa-register/vue"

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW()

const close = async () => {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<template>
  <div
    v-if="offlineReady || needRefresh"
    class="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-xl bg-gray-900/90 p-4 text-white shadow-lg backdrop-blur-sm sm:bottom-6 sm:left-auto sm:right-6 sm:w-96"
    role="alert"
  >
    <div class="mr-4 text-[15px] font-medium">
      <span v-if="offlineReady"> App ready to work offline </span>
      <span v-else> New update available! </span>
    </div>
    <div class="flex items-center gap-3">
      <button
        v-if="needRefresh"
        @click="updateServiceWorker()"
        class="rounded-lg bg-[#007AFF] px-3 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Update
      </button>
      <button @click="close" class="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>
