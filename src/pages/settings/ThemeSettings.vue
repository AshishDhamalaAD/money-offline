<script setup>
import { computed, onMounted, ref } from "vue"

import { useSettingsStore } from "@/store/settingsStore"
import { formatDate, getNepalDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/moneyUtils"
import { LOCALE_OPTIONS } from "@/utils/locale"

const settingsStore = useSettingsStore()
const themeSaving = ref(false)
const themeError = ref("")
const formatSaving = ref(false)
const formatError = ref("")

const options = [
  { id: "light", label: "Light", description: "Always use light mode" },
  { id: "dark", label: "Dark", description: "Always use dark mode" },
  { id: "system", label: "System", description: "Follow your OS theme" },
]

const selected = computed(() => settingsStore.themePreference)
const locale = computed(() => settingsStore.locale)
const bsEnabled = computed(() => settingsStore.calendarSystem === "bs")

const amountPreview = computed(() => formatCurrency(1234567.89))
const datePreview = computed(() => formatDate(getNepalDate(), { weekday: undefined }))

onMounted(async () => {
  await settingsStore.init()
})

async function selectTheme(preference) {
  if (themeSaving.value || selected.value === preference) return
  themeSaving.value = true
  themeError.value = ""

  const result = await settingsStore.setThemePreference(preference)
  if (!result.success) {
    themeError.value = "Could not save theme. Please try again."
  }

  themeSaving.value = false
}

async function selectLocale(event) {
  const value = event.target.value
  if (formatSaving.value || locale.value === value) return

  formatSaving.value = true
  formatError.value = ""

  const result = await settingsStore.setLocale(value)
  if (!result.success) {
    formatError.value = "Could not save the language. Please try again."
  }

  formatSaving.value = false
}

async function toggleCalendar() {
  if (formatSaving.value) return

  formatSaving.value = true
  formatError.value = ""

  const result = await settingsStore.setCalendarSystem(bsEnabled.value ? "ad" : "bs")
  if (!result.success) {
    formatError.value = "Could not save the calendar. Please try again."
  }

  formatSaving.value = false
}
</script>

<template>
  <div class="space-y-6">
    <section class="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-4 border border-gray-100 dark:border-gray-800">
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Choose how the app looks on your device.</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          :disabled="themeSaving"
          @click="selectTheme(option.id)"
          :class="[
            'w-full rounded-md border p-4 text-left transition-all focus:outline-none focus:ring-2',
            selected === option.id
              ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-100 shadow-sm'
              : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/30',
            themeSaving ? 'opacity-60 cursor-not-allowed' : '',
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

      <p v-if="themeSaving" class="text-sm text-gray-500 dark:text-gray-400">Saving your preference...</p>
      <p v-if="themeError" class="text-sm text-red-600 dark:text-red-400">{{ themeError }}</p>
    </section>

    <section class="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-5 border border-gray-100 dark:border-gray-800">
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Language &amp; region</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Choose how amounts and dates are written. Amounts never show a currency symbol.
        </p>
      </div>

      <label class="block space-y-1.5">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Number and date format</span>
        <select
          :value="locale"
          :disabled="formatSaving"
          class="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          @change="selectLocale"
        >
          <option v-for="option in LOCALE_OPTIONS" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>
      </label>

      <div class="flex items-start justify-between gap-4">
        <div class="space-y-1">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Bikram Sambat dates</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Show dates in the Nepali calendar (BS). Entry and date filters still use the Gregorian calendar.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          :aria-checked="bsEnabled ? 'true' : 'false'"
          aria-label="Bikram Sambat dates"
          :disabled="formatSaving"
          :class="[
            bsEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700',
            'relative mt-1 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900',
          ]"
          @click="toggleCalendar"
        >
          <span
            aria-hidden="true"
            :class="[
              bsEnabled ? 'translate-x-5' : 'translate-x-0',
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-gray-300',
            ]"
          />
        </button>
      </div>

      <div class="space-y-1.5 rounded-md bg-gray-50 p-4 text-sm dark:bg-gray-800/60">
        <div class="flex items-center justify-between gap-4">
          <span class="text-gray-500 dark:text-gray-400">Amount</span>
          <span class="font-medium tabular-nums text-gray-900 dark:text-gray-100">{{ amountPreview }}</span>
        </div>
        <div class="flex items-center justify-between gap-4">
          <span class="text-gray-500 dark:text-gray-400">Date</span>
          <span class="font-medium text-gray-900 dark:text-gray-100">{{ datePreview }}</span>
        </div>
      </div>

      <p v-if="formatSaving" class="text-sm text-gray-500 dark:text-gray-400">Saving your preference...</p>
      <p v-if="formatError" class="text-sm text-red-600 dark:text-red-400">{{ formatError }}</p>
    </section>
  </div>
</template>
