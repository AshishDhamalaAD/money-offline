<script setup>
import { onMounted, onUnmounted, watch } from "vue"

const props = defineProps({
  show: Boolean,
  title: String,
  zIndex: {
    type: String,
    default: "z-50",
  },
})

const emit = defineEmits(["close"])

// Lock body scroll when modal is open
watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
  }
)

function handleEscape(e) {
  if (e.key === "Escape" && props.show) {
    emit("close")
  }
}

onMounted(() => document.addEventListener("keydown", handleEscape))
onUnmounted(() => document.removeEventListener("keydown", handleEscape))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-[50ms] ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
        :class="[zIndex]"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')"></div>

        <!-- Panel -->
        <Transition
          enter-active-class="transition duration-[50ms] ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div
            class="relative w-full max-w-lg transform overflow-hidden rounded-sm bg-white p-6 shadow-xl transition-all"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 v-if="title" class="text-lg font-semibold text-gray-900">{{ title }}</h3>
              <button
                @click="$emit('close')"
                class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <slot />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
