<script setup>
import { onMounted, onUnmounted, watch } from "vue"

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
})

const emit = defineEmits(["update:modelValue", "close"])

function close() {
  emit("update:modelValue", false)
  emit("close")
}

// Close on escape key
function onEscape(e) {
  if (e.key === "Escape" && props.modelValue) {
    close()
  }
}

onMounted(() => {
  document.addEventListener("keydown", onEscape)
})

onUnmounted(() => {
  document.removeEventListener("keydown", onEscape)
})

// Prevent body scroll when open
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="relative z-50" role="dialog" aria-modal="true">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50 transition-opacity" @click="close"></div>

      <!-- Sheet -->
      <div
        class="fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-out bg-white dark:bg-gray-900 rounded-t-xl shadow-xl max-h-[90vh] overflow-y-auto w-full max-w-lg mx-auto md:relative md:rounded-xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:max-w-md"
      >
        <!-- Handle bar for mobile feel -->
        <div class="md:hidden flex justify-center pt-3 pb-1" @click="close">
          <div class="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
        </div>

        <div class="p-4">
          <div v-if="title" class="mb-4 text-center">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
          </div>

          <slot></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Optional: Add custom transition classes if not using utility classes for animation */
</style>
