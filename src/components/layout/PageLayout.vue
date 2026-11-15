<script setup>
import { computed } from "vue"
import { useRoute } from "vue-router"

// Simple layout wrapper component
const route = useRoute()

// Tab pages show the bottom nav, so they need a little more clearance.
const bottomPadding = computed(() => (route.meta.tab ? "pb-safe-24" : "pb-safe-20"))
</script>

<template>
  <div :class="['min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors', bottomPadding]">
    <slot />
  </div>
</template>
