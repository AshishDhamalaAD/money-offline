<script setup>
import { ref, watch, onUnmounted } from "vue"

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: "",
  },
  actionLabel: {
    type: String,
    default: "",
  },
  duration: {
    type: Number,
    default: 5000,
  },
  // Bump this to restart the auto-dismiss timer while the bar stays visible.
  revision: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(["action", "close"])

let timer = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function startTimer() {
  clearTimer()
  if (props.show && props.duration > 0) {
    timer = setTimeout(() => emit("close"), props.duration)
  }
}

watch(() => [props.show, props.revision, props.message, props.duration], startTimer, { immediate: true })
onUnmounted(clearTimer)

function handleAction() {
  clearTimer()
  emit("action")
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-3 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-3 opacity-0"
    >
      <div v-if="show" class="fixed inset-x-0 bottom-safe-24 z-50 px-4">
        <div
          class="mx-auto flex max-w-lg items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
          role="status"
        >
          <p class="min-w-0 flex-1 text-sm font-medium">{{ message }}</p>
          <button
            v-if="actionLabel"
            type="button"
            class="shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-indigo-300 hover:bg-white/10 dark:text-indigo-600 dark:hover:bg-black/5"
            @click="handleAction"
          >
            {{ actionLabel }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
