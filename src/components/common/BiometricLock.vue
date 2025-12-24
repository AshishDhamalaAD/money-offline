<script setup>
import { ref, onMounted } from "vue"
import { useSettingsStore } from "@/store/settingsStore"
import IconLock from "@/assets/icons/IconLock.vue"

const emit = defineEmits(["unlocked", "use-pin"])
const settingsStore = useSettingsStore()
const loading = ref(false)
const error = ref(null)
const isUnlocking = ref(false)

async function unlock() {
  loading.value = true
  error.value = null

  const result = await settingsStore.verifyBiometric()

  if (result.success) {
    isUnlocking.value = true
    setTimeout(() => {
      emit("unlocked")
    }, 400)
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
  <div
    :class="[
      'fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-500',
      isUnlocking ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100',
      'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white',
    ]"
  >
    <div class="flex flex-col items-center space-y-6 p-6 max-w-sm w-full text-center">
      <div class="p-4 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors">
        <IconLock class="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-bold">App Locked</h1>
        <p class="text-gray-500 dark:text-gray-400">Please authenticate to continue</p>
      </div>

      <div v-if="error" class="text-red-600 dark:text-red-400 text-sm font-medium">
        {{ error }}
      </div>

      <button
        @click="unlock"
        :disabled="loading"
        class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors shadow-sm"
      >
        {{ loading ? "Verifying..." : "Unlock with Biometrics" }}
      </button>

      <button
        v-if="settingsStore.pinEnabled"
        @click="$emit('use-pin')"
        class="w-full py-2 px-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors text-sm font-medium"
      >
        Unlock with PIN
      </button>
    </div>
  </div>
</template>
