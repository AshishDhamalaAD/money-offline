<script setup>
import { defineAsyncComponent, onMounted, onUnmounted, ref } from "vue"

// FilePond and its preview plugin are a ~230 KB chunk. Load the widget only
// when it is about to scroll into view, so opening a form does not download an
// uploader the user may never touch.
const ImageUpload = defineAsyncComponent(() => import("./ImageUpload.vue"))

defineProps({
  from: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(["upload"])
const target = ref(null)
const isVisible = ref(false)
let observer = null

onMounted(() => {
  if (typeof IntersectionObserver === "undefined") {
    isVisible.value = true
    return
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        observer.disconnect()
      }
    },
    // Start loading slightly before the widget is on screen.
    { rootMargin: "200px" },
  )

  if (target.value) observer.observe(target.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <div ref="target">
    <ImageUpload v-if="isVisible" :from="from" @upload="emit('upload', $event)" />
  </div>
</template>
