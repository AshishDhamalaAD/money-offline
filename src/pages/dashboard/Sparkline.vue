<script setup>
import { computed } from "vue"

const props = defineProps({
  values: {
    type: Array,
    default: () => [],
  },
  width: {
    type: Number,
    default: 88,
  },
  height: {
    type: Number,
    default: 28,
  },
})

const path = computed(() => {
  const values = props.values.length > 1 ? props.values : [0, 0]
  const max = Math.max(...values, 1)
  const stepX = props.width / (values.length - 1)
  const innerHeight = props.height - 2

  return values
    .map((value, index) => {
      const x = index * stepX
      const y = props.height - 1 - (value / max) * innerHeight
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
})

const hasData = computed(() => props.values.some((value) => Number(value) > 0))
</script>

<template>
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    fill="none"
    aria-hidden="true"
  >
    <path
      :d="path"
      stroke="currentColor"
      :stroke-width="hasData ? 1.75 : 1"
      :stroke-opacity="hasData ? 1 : 0.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
