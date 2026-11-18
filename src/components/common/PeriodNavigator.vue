<script setup>
import { computed } from "vue"

import IconCaretDown from "@/assets/icons/IconCaretDown.vue"
import IconChevronLeft from "@/assets/icons/IconChevronLeft.vue"
import IconChevronRight from "@/assets/icons/IconChevronRight.vue"
import { formatMonthYear } from "@/utils/dateUtils"

const props = defineProps({
  modelValue: {
    type: String,
    default: "all",
  },
  // The visible period as "YYYY-MM". The day is irrelevant here.
  anchor: {
    type: String,
    required: true,
  },
  // Periods the user may pick, newest first. The list stops at the current
  // month and at the book's first record, so there is nothing empty to browse.
  options: {
    type: Array,
    default: () => [],
  },
  canPrev: {
    type: Boolean,
    default: true,
  },
  canNext: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(["update:modelValue", "update:anchor"])

const modes = [
  { label: "All", value: "all" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
]

const parts = computed(() => {
  const [year, month] = props.anchor.split("-").map(Number)
  return { year, month }
})

const label = computed(() => {
  const match = props.options.find((option) => option.value === props.anchor)
  if (match) return match.label

  if (props.modelValue === "year") return String(parts.value.year)

  return formatMonthYear(new Date(parts.value.year, parts.value.month - 1, 1), { calendar: "ad" })
})

const stepLabel = computed(() => (props.modelValue === "year" ? "year" : "month"))

function shift(step) {
  const { year, month } = parts.value

  if (props.modelValue === "year") {
    emit("update:anchor", `${year + step}-${String(month).padStart(2, "0")}`)
    return
  }

  const date = new Date(year, month - 1 + step, 1)
  emit("update:anchor", `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`)
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div
      class="inline-flex items-center rounded-full bg-white p-0.5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      role="group"
      aria-label="Browse transactions by period"
    >
      <button
        v-for="mode in modes"
        :key="mode.value"
        type="button"
        @click="emit('update:modelValue', mode.value)"
        :aria-pressed="modelValue === mode.value"
        :class="[
          'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          modelValue === mode.value
            ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
            : 'text-gray-600 dark:text-gray-200',
        ]"
      >
        {{ mode.label }}
      </button>
    </div>

    <div v-if="modelValue !== 'all'" class="flex items-center">
      <button
        type="button"
        :disabled="!canPrev"
        @click="shift(-1)"
        :aria-label="`Previous ${stepLabel}`"
        class="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:disabled:hover:bg-transparent"
      >
        <IconChevronLeft class="h-4 w-4" />
      </button>

      <!-- Tapping the label opens the native period picker, so a month three
           years back is one tap instead of thirty-six. -->
      <label v-if="options.length" class="relative flex min-w-[7.5rem] items-center justify-center">
        <span class="sr-only">Choose {{ stepLabel }}</span>
        <select
          :value="anchor"
          @change="emit('update:anchor', $event.target.value)"
          class="w-full cursor-pointer appearance-none bg-transparent py-1 pl-1 pr-5 text-center text-sm font-semibold text-gray-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-sm dark:text-gray-100"
        >
          <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <IconCaretDown
          class="pointer-events-none absolute right-1 h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
        />
      </label>

      <span
        v-else
        class="min-w-[7.5rem] whitespace-nowrap text-center text-sm font-semibold text-gray-900 dark:text-gray-100"
      >
        {{ label }}
      </span>

      <button
        type="button"
        :disabled="!canNext"
        @click="shift(1)"
        :aria-label="`Next ${stepLabel}`"
        class="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:disabled:hover:bg-transparent"
      >
        <IconChevronRight class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
