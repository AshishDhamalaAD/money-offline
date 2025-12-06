<script setup>
import { watch } from "vue"
import BaseInput from "@/components/common/BaseInput.vue"

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  startDate: {
    type: String,
    default: "",
  },
  endDate: {
    type: String,
    default: "",
  },
})

const emit = defineEmits(["update:modelValue", "update:startDate", "update:endDate"])

const filterOptions = [
  { label: "All", value: "all" },
  { label: "This Month", value: "month" },
  { label: "Last Month", value: "last-month" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Year", value: "this-year" },
  { label: "Last Year", value: "last-year" },
  { label: "Custom Date Range", value: "custom" },
]

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function calculateDateRange(filter) {
  const now = new Date()
  let start = null
  let end = null

  if (filter === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  } else if (filter === "last-month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    end = new Date(now.getFullYear(), now.getMonth(), 0)
  } else if (filter === "today") {
    start = new Date(now)
    end = new Date(now)
  } else if (filter === "yesterday") {
    start = new Date(now)
    start.setDate(start.getDate() - 1)
    end = new Date(start)
  } else if (filter === "this-year") {
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear(), 11, 31)
  } else if (filter === "last-year") {
    start = new Date(now.getFullYear() - 1, 0, 1)
    end = new Date(now.getFullYear() - 1, 11, 31)
  }

  return {
    start: start ? formatDate(start) : "",
    end: end ? formatDate(end) : "",
  }
}

function updateFilter(value) {
  emit("update:modelValue", value)
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal === "custom") {
      // Do nothing, let user pick dates
    } else if (newVal === "all") {
      if (props.startDate) emit("update:startDate", "")
      if (props.endDate) emit("update:endDate", "")
    } else {
      const { start, end } = calculateDateRange(newVal)
      if (start !== props.startDate) emit("update:startDate", start)
      if (end !== props.endDate) emit("update:endDate", end)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-4 px-4">
      <button
        v-for="opt in filterOptions"
        :key="opt.value"
        @click="updateFilter(opt.value)"
        :class="[
          'rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
          modelValue === opt.value
            ? 'bg-indigo-600 text-white shadow-md dark:bg-indigo-500'
            : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700',
        ]"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Custom Date Range Pickers -->
    <div
      v-if="modelValue === 'custom'"
      class="grid grid-cols-2 gap-3 bg-white p-4 rounded-sm shadow-sm dark:bg-gray-900 dark:border dark:border-gray-800"
    >
      <BaseInput
        :model-value="startDate"
        @update:model-value="$emit('update:startDate', $event)"
        type="date"
        label="Start Date"
      />
      <BaseInput
        :model-value="endDate"
        @update:model-value="$emit('update:endDate', $event)"
        type="date"
        label="End Date"
      />
    </div>
  </div>
</template>
