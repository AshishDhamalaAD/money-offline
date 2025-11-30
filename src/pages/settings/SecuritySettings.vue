<script setup>
import { ref, computed } from "vue"
import { useSettingsStore } from "@/store/modules/settingsStore"

const settingsStore = useSettingsStore()
const loading = ref(false)
const error = ref(null)

const isEnabled = computed(() => settingsStore.biometricEnabled)

async function toggleBiometric() {
  loading.value = true
  error.value = null

  if (isEnabled.value) {
    const result = await settingsStore.disableBiometric()
    if (!result.success) {
      error.value = result.message
    }
  } else {
    const result = await settingsStore.registerBiometric()
    if (!result.success) {
      error.value = "Failed to register biometric. Please ensure your device supports it."
    }
  }

  loading.value = false
}
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6 space-y-6">
    <div>
      <h2 class="text-lg font-medium text-gray-900">Security</h2>
      <p class="text-sm text-gray-500">Manage your app security settings</p>
    </div>

    <div class="flex items-center justify-between py-4 border-t border-gray-100">
      <div class="space-y-1">
        <h3 class="text-base font-medium text-gray-900">Biometric Lock</h3>
        <p class="text-sm text-gray-500">Require fingerprint or FaceID to open the app</p>
      </div>

      <button
        @click="toggleBiometric"
        :disabled="loading"
        :class="[
          isEnabled ? 'bg-indigo-600' : 'bg-gray-200',
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2',
        ]"
      >
        <span class="sr-only">Use setting</span>
        <span
          aria-hidden="true"
          :class="[
            isEnabled ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          ]"
        />
      </button>
    </div>

    <div v-if="error" class="p-4 bg-red-50 text-red-700 rounded-md text-sm">
      {{ error }}
    </div>
  </div>
</template>
