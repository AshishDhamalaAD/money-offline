<script setup>
import { computed } from "vue"

const props = defineProps({
  percent: {
    type: Number,
    default: 0,
  },
  size: {
    type: Number,
    default: 52,
  },
  stroke: {
    type: Number,
    default: 5,
  },
})

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => {
  const capped = Math.max(0, Math.min(props.percent, 100))
  return circumference.value * (1 - capped / 100)
})

// Green-ish is not used: budgets read as "fine" until they get close.
const tone = computed(() => {
  if (props.percent >= 100) return "text-red-500"
  if (props.percent >= 80) return "text-amber-500"
  return "text-indigo-500"
})
</script>

<template>
  <div
    class="relative inline-flex shrink-0 items-center justify-center"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="-rotate-90">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="currentColor"
        :stroke-width="stroke"
        class="text-gray-200 dark:text-gray-700"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="currentColor"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :class="tone"
      />
    </svg>
    <span class="absolute text-[10px] font-semibold text-gray-700 dark:text-gray-200">
      {{ Math.round(percent) }}%
    </span>
  </div>
</template>
