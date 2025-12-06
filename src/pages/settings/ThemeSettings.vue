<script setup>
import { computed, onMounted, ref } from "vue"

import { useSettingsStore } from "@/store/settingsStore"

const settingsStore = useSettingsStore()
const saving = ref(false)
const error = ref("")

const options = [
  { id: "light", label: "Light", description: "Always use light mode" },
  { id: "dark", label: "Dark", description: "Always use dark mode" },
  { id: "system", label: "System", description: "Follow your OS theme" },
]

const selected = computed(() => settingsStore.themePreference)

onMounted(async () => {
  await settingsStore.init()
})

async function selectTheme(preference) {
  if (saving.value || selected.value === preference) return
  saving.value = true
  error.value = ""

  const result = await settingsStore.setThemePreference(preference)
  if (!result.success) {
    error.value = "Could not save theme. Please try again."
  }

  saving.value = false
}
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-4 border border-gray-100 dark:border-gray-800">
    <div class="space-y-1">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">Choose how the app looks on your device.</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        :disabled="saving"
        @click="selectTheme(option.id)"
        :class="[
          'w-full rounded-md border p-4 text-left transition-all focus:outline-none focus:ring-2',
          selected === option.id
            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-100 shadow-sm'
            : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/30',
          saving ? 'opacity-60 cursor-not-allowed' : '',
        ]"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold">{{ option.label }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ option.description }}</p>
          </div>
          <span
            class="h-4 w-4 rounded-full border flex items-center justify-center"
            :class="[
              selected === option.id
                ? 'border-indigo-600 bg-indigo-600'
                : 'border-gray-300 dark:border-gray-600',
            ]"
          >
            <span v-if="selected === option.id" class="h-2 w-2 rounded-full bg-white"></span>
          </span>
        </div>
      </button>
    </div>

    <p v-if="saving" class="text-sm text-gray-500 dark:text-gray-400">Saving your preference...</p>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
  </div>
</template>
