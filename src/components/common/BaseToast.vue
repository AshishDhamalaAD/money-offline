<script setup>
import { ref, watch } from "vue"

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "error", // error, success, info
  },
  duration: {
    type: Number,
    default: 4000,
  },
})

const emit = defineEmits(["close"])

const isVisible = ref(props.show)

watch(
  () => props.show,
  (newVal) => {
    isVisible.value = newVal
    if (newVal && props.duration > 0) {
      setTimeout(() => {
        emit("close")
      }, props.duration)
    }
  }
)

const bgColor = {
  error: "bg-red-500",
  success: "bg-green-500",
  info: "bg-blue-500",
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div v-if="isVisible" class="fixed top-4 left-1/2 -translate-x-1/2 z-9999 max-w-md w-full px-4">
        <div :class="[bgColor[type], 'rounded-lg shadow-lg p-4 flex items-start gap-3 text-white']">
          <!-- Icon -->
          <div class="shrink-0">
            <svg v-if="type === 'error'" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <svg v-else-if="type === 'success'" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <!-- Message -->
          <p class="flex-1 text-sm font-medium">{{ message }}</p>

          <!-- Close button -->
          <button @click="emit('close')" class="shrink-0 hover:bg-white/20 rounded p-1 transition-colors">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
