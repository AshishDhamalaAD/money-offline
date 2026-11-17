<script setup>
import { computed } from "vue"

import IconChevronLeft from "@/assets/icons/IconChevronLeft.vue"
import IconChevronRight from "@/assets/icons/IconChevronRight.vue"

const props = defineProps({
  modelValue: {
    type: String,
    default: "month",
  },
  // The visible period as "YYYY-MM". The day is irrelevant here.
  anchor: {
    type: String,
    required: true,
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
  if (props.modelValue === "year") return String(parts.value.year)

  return new Date(parts.value.year, parts.value.month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
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
          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
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
        @click="shift(-1)"
        :aria-label="`Previous ${stepLabel}`"
        class="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
      >
        <IconChevronLeft class="h-4 w-4" />
      </button>

      <span
        class="min-w-[6.75rem] whitespace-nowrap text-center text-sm font-semibold text-gray-900 dark:text-gray-100"
        aria-live="polite"
      >
        {{ label }}
      </span>

      <button
        type="button"
        @click="shift(1)"
        :aria-label="`Next ${stepLabel}`"
        class="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
      >
        <IconChevronRight class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
