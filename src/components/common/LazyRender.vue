<script setup>
import { ref, onMounted, onUnmounted } from "vue"

const props = defineProps({
  minHeight: {
    type: String,
    default: "100px",
  },
})

const target = ref(null)
const isVisible = ref(false)
let observer = null

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        observer.disconnect()
      }
    },
    {
      rootMargin: "50px", // Preload a bit before it comes into view
    }
  )

  if (target.value) {
    observer.observe(target.value)
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <div ref="target" :style="{ minHeight }">
    <slot v-if="isVisible" />
    <div v-else class="h-full flex items-center justify-center text-gray-400">Loading...</div>
  </div>
</template>
