<script setup>
import { computed, onMounted, ref } from "vue"

import { useSettingsStore } from "@/store/settingsStore"
import { useInstallPrompt } from "@/composables/useInstallPrompt"
import { useReminders } from "@/composables/useReminders"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseToast from "@/components/common/BaseToast.vue"

const settingsStore = useSettingsStore()
const { canInstall, installed, isIOS, promptInstall } = useInstallPrompt()
const { supported, permission, requestPermission, refreshPermission, sendTest } = useReminders()

const saving = ref(false)
const testing = ref(false)

const toast = ref({ show: false, message: "", type: "success" })

function showToast(message, type = "success") {
  toast.value = { show: false, message, type }
  setTimeout(() => {
    toast.value = { ...toast.value, show: true }
  }, 0)
}

const remindersOn = computed(() => settingsStore.remindersEnabled)
const reminderTime = computed({
  get: () => settingsStore.reminderTime,
  set: (value) => saveTime(value),
})

const permissionLabel = computed(() => {
  if (!supported.value) return "Notifications are not supported in this browser."
  if (permission.value === "granted") return "Notifications are allowed."
  if (permission.value === "denied") return "Notifications are blocked. Allow them in your browser settings."
  return "Notifications are not allowed yet."
})

onMounted(async () => {
  await settingsStore.init()
  refreshPermission()
})

async function install() {
  const choice = await promptInstall()

  if (choice.outcome === "accepted") showToast("Installing Money Manager.")
  else if (choice.outcome === "unavailable") {
    showToast("Use your browser menu to install this app.", "info")
  }
}

async function toggleReminders() {
  if (saving.value) return

  if (!supported.value) {
    showToast("Notifications are not supported in this browser.", "error")
    return
  }

  const next = !remindersOn.value
  saving.value = true

  try {
    if (next && permission.value !== "granted") {
      const result = await requestPermission()
      if (result !== "granted") {
        showToast(
          result === "denied"
            ? "Notifications are blocked. Allow them in your browser settings."
            : "Notification permission was not granted.",
          "error",
        )
        return
      }
    }

    const result = await settingsStore.setRemindersEnabled(next)
    if (!result.success) {
      showToast("Could not save the reminder setting.", "error")
      return
    }

    showToast(next ? "Reminders turned on." : "Reminders turned off.")
  } finally {
    saving.value = false
  }
}

async function saveTime(value) {
  if (!value) return
  await settingsStore.setReminderTime(value)
  showToast(`Reminder time set to ${value}.`)
}

async function testNotification() {
  if (testing.value) return
  testing.value = true

  try {
    const result = await sendTest()
    showToast(result.success ? "Test notification sent." : result.message, result.success ? "success" : "error")
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Install -->
    <section class="rounded-lg border border-gray-100 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Install app</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Installed, the app opens full screen, launches from your home screen and keeps working offline.
        </p>
      </div>

      <div
        v-if="installed"
        class="mt-4 flex items-center gap-3 rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300"
      >
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p>Money Manager is installed on this device.</p>
      </div>

      <div v-else class="mt-4 space-y-4">
        <ol
          v-if="isIOS"
          class="list-decimal space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300"
        >
          <li>Open this page in Safari.</li>
          <li>Tap the <span class="font-medium">Share</span> button in the toolbar.</li>
          <li>Choose <span class="font-medium">Add to Home Screen</span>, then tap Add.</li>
        </ol>

        <p v-else-if="!canInstall" class="text-sm text-gray-600 dark:text-gray-400">
          Open the browser menu and choose <span class="font-medium">Install app</span> or
          <span class="font-medium">Add to Home Screen</span>.
        </p>

        <BaseButton v-if="canInstall && !isIOS" @click="install">Install Money Manager</BaseButton>
      </div>
    </section>

    <!-- Reminders -->
    <section class="rounded-lg border border-gray-100 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Recurring reminders</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Get a daily notification when scheduled transactions are waiting to be created. The home-screen badge
            always shows how many are due.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          :aria-checked="remindersOn ? 'true' : 'false'"
          aria-label="Recurring reminders"
          :disabled="saving"
          :class="[
            remindersOn ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700',
            'relative mt-1 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900',
          ]"
          @click="toggleReminders"
        >
          <span
            aria-hidden="true"
            :class="[
              remindersOn ? 'translate-x-5' : 'translate-x-0',
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-gray-300',
            ]"
          />
        </button>
      </div>

      <div v-if="remindersOn" class="mt-5 space-y-4">
        <label class="block space-y-1.5">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Reminder time</span>
          <input
            v-model="reminderTime"
            type="time"
            class="block w-40 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>

        <p
          class="text-xs"
          :class="permission === 'denied' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'"
        >
          {{ permissionLabel }}
        </p>

        <BaseButton variant="secondary" size="sm" :loading="testing" :disabled="testing" @click="testNotification">
          Send test notification
        </BaseButton>
      </div>

      <p v-else class="mt-4 text-xs text-gray-500 dark:text-gray-400">{{ permissionLabel }}</p>
    </section>

    <BaseToast :show="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
