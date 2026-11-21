<script setup>
import { ref, useId } from "vue"
import { useDialog } from "@/composables/useDialog"

const props = defineProps({
  show: Boolean,
  title: String,
  zIndex: { type: String, default: "z-50" },
  initialFocus: String,
  descriptionId: String,
  ariaLabel: { type: String, default: "Dialog" },
  dismissible: { type: Boolean, default: true },
})
const emit = defineEmits(["close"])
const dialogRef = ref(null)
const titleId = useId()
const { isTop } = useDialog(dialogRef, () => props.show, {
  close: () => emit("close"),
  get initialFocus() { return props.initialFocus },
  dismissible: () => props.dismissible,
})
function close() {
  if (props.dismissible && isTop()) emit("close")
}
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
        ref="dialogRef"
        class="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
        :class="[zIndex]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        :aria-describedby="descriptionId"
        :aria-label="title ? undefined : ariaLabel"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="close"></div>

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
            class="relative w-full max-w-lg transform max-h-[90vh] overflow-y-auto rounded-sm bg-white p-6 shadow-xl transition-all dark:bg-gray-900 dark:text-gray-100 dark:shadow-gray-900/40"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 :id="titleId" v-if="title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
              <button
                v-if="dismissible"
                type="button"
                aria-label="Close dialog"
                @click="close"
                class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg aria-hidden="true" focusable="false" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
