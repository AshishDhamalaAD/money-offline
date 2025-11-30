<script setup>
import { ref, onMounted } from "vue"
import { useSettingsStore } from "@/store/modules/settingsStore"
import IconLock from "@/assets/icons/IconLock.vue"

const emit = defineEmits(["unlocked"])
const settingsStore = useSettingsStore()
const loading = ref(false)
const error = ref(null)

async function unlock() {
  loading.value = true
  error.value = null

  const result = await settingsStore.verifyBiometric()

  if (result.success) {
    emit("unlocked")
  } else {
    error.value = "Authentication failed. Please try again."
  }

  loading.value = false
}

onMounted(() => {
  // Auto-trigger unlock prompt on mount
  unlock()
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white">
    <div class="flex flex-col items-center space-y-6 p-6 max-w-sm w-full text-center">
      <div class="p-4 bg-gray-800 rounded-full">
        <IconLock class="w-12 h-12 text-indigo-400" />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-bold">App Locked</h1>
        <p class="text-gray-400">Please authenticate to continue</p>
      </div>

      <div v-if="error" class="text-red-400 text-sm">
        {{ error }}
      </div>

      <button
        @click="unlock"
        :disabled="loading"
        class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {{ loading ? "Verifying..." : "Unlock" }}
      </button>
    </div>
  </div>
</template>
