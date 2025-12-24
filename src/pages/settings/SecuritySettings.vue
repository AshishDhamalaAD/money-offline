<script setup>
import { ref, computed } from "vue"
import { useSettingsStore } from "@/store/settingsStore"
import PinLock from "@/components/common/PinLock.vue"

const settingsStore = useSettingsStore()
const loading = ref(false)
const error = ref(null)
const showPinSetup = ref(false)
const showPinVerify = ref(false)
const verifyAction = ref(null) // 'disable-pin' | 'disable-biometric'

const isBiometricEnabled = computed(() => settingsStore.biometricEnabled)
const isPinEnabled = computed(() => settingsStore.pinEnabled)

async function toggleBiometric() {
  if (isBiometricEnabled.value) {
    verifyAction.value = "disable-biometric"
    showPinVerify.value = true
  } else {
    loading.value = true
    error.value = null
    // Check if PIN is enabled first
    if (!isPinEnabled.value) {
      error.value = "PIN must be enabled to use Biometric lock."
      loading.value = false
      return
    }

    const result = await settingsStore.registerBiometric()
    if (!result.success) {
      error.value = "Failed to register biometric. Please ensure your device supports it."
    }
    loading.value = false
  }
}

async function togglePin() {
  if (isPinEnabled.value) {
    verifyAction.value = "disable-pin"
    showPinVerify.value = true
  } else {
    showPinSetup.value = true
  }
}

async function handleVerification() {
  showPinVerify.value = false
  loading.value = true
  error.value = null

  if (verifyAction.value === "disable-pin") {
    const result = await settingsStore.disablePin()
    if (!result.success) {
      error.value = result.message
    }
  } else if (verifyAction.value === "disable-biometric") {
    const result = await settingsStore.disableBiometric()
    if (!result.success) {
      error.value = result.message
    }
  }

  loading.value = false
  verifyAction.value = null
}

function onPinSetupComplete() {
  showPinSetup.value = false
}

function onPinSetupCancel() {
  showPinSetup.value = false
}

function onPinVerifyCancel() {
  showPinVerify.value = false
  verifyAction.value = null
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-800 transition-colors"
  >
    <div class="mb-6">
      <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Security</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">Manage your app security settings</p>
    </div>

    <!-- PIN Lock Section -->
    <div class="flex items-center justify-between gap-4 py-4 border-t border-gray-100 dark:border-gray-800">
      <div class="space-y-1">
        <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">PIN Lock</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">Require a 6-digit PIN to open the app</p>
      </div>

      <button
        @click="togglePin"
        :disabled="loading"
        :class="[
          isPinEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700',
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        ]"
      >
        <span class="sr-only">Use PIN Lock</span>
        <span
          aria-hidden="true"
          :class="[
            isPinEnabled ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-gray-300',
          ]"
        />
      </button>
    </div>

    <!-- Biometric Lock Section -->
    <div class="flex items-center justify-between gap-4 py-4 border-t border-gray-100 dark:border-gray-800">
      <div class="space-y-1">
        <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">Biometric Lock</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">Require fingerprint or FaceID to open the app</p>
      </div>

      <button
        @click="toggleBiometric"
        :disabled="loading || !isPinEnabled"
        :class="[
          isBiometricEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700',
          !isPinEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        ]"
      >
        <span class="sr-only">Use Biometric Lock</span>
        <span
          aria-hidden="true"
          :class="[
            isBiometricEnabled ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-gray-300',
          ]"
        />
      </button>
    </div>

    <!-- Auto-Lock Timeout Section -->
    <div
      v-if="isPinEnabled || isBiometricEnabled"
      class="flex items-center justify-between gap-4 py-4 border-t border-gray-100 dark:border-gray-800"
    >
      <div class="space-y-1">
        <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">Auto-Lock Timeout</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">Lock the app after being unused for a period</p>
      </div>

      <select
        :value="settingsStore.autoLockTimeout"
        @change="(e) => settingsStore.setAutoLockTimeout(parseInt(e.target.value))"
        class="bg-gray-50 dark:bg-gray-800 border-none rounded-md text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-600 outline-none"
      >
        <option :value="0">Immediate</option>
        <option v-for="m in [5, 10, 15, 20, 25, 30]" :key="m" :value="m">{{ m }} minutes</option>
      </select>
    </div>

    <div v-if="error" class="p-4 bg-red-50 text-red-700 rounded-md text-sm dark:bg-red-900/30 dark:text-red-200">
      {{ error }}
    </div>

    <PinLock v-if="showPinSetup" mode="setup" @setup-complete="onPinSetupComplete" @cancel="onPinSetupCancel" />

    <PinLock
      v-if="showPinVerify"
      mode="verify"
      title="Verify Identity"
      description="Please enter your current PIN to turn off security."
      @verified="handleVerification"
      @cancel="onPinVerifyCancel"
    />
  </div>
</template>
