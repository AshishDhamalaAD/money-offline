<script setup>
import { ref, useId, watch } from "vue"
import IconX from "@/assets/icons/IconX.vue"
import { useDialog } from "@/composables/useDialog"

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, default: "" },
  initialFocus: String,
  descriptionId: String,
  ariaLabel: { type: String, default: "Dialog" },
  dismissible: { type: Boolean, default: true },
})
const emit = defineEmits(["update:modelValue", "close"])
const dialogRef = ref(null)
const titleId = useId()
const openedAt = ref(0)
watch(() => props.modelValue, (open) => { if (open) openedAt.value = Date.now() }, { immediate: true })
const { isTop } = useDialog(dialogRef, () => props.modelValue, {
  close: () => close(),
  get initialFocus() { return props.initialFocus },
  dismissible: () => props.dismissible,
})
function close() {
  if (!props.dismissible || !isTop()) return
  emit("update:modelValue", false)
  emit("close")
}
function onBackdropClick() {
  if (Date.now() - openedAt.value >= 350) close()
}
</script>

<template>
  <Teleport to="body">
    <div ref="dialogRef" v-if="modelValue" class="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" :aria-describedby="descriptionId" :aria-labelledby="title ? titleId : undefined" :aria-label="title ? undefined : ariaLabel">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50 transition-opacity" @click="onBackdropClick"></div>

      <!-- Sheet -->
      <div
        class="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-xl bg-white shadow-xl dark:bg-gray-900 md:max-w-md md:rounded-xl"
      >
        <!-- Handle bar for mobile feel -->
        <div aria-hidden="true" class="md:hidden flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
        </div>

        <div class="p-4">
          <div v-if="title || dismissible" class="relative mb-4 min-h-8">
            <h3 v-if="title" :id="titleId" class="mx-9 text-center text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
            <button v-if="dismissible" type="button" aria-label="Close dialog" class="absolute right-0 top-0 rounded-full p-1" @click="close">
              <IconX class="h-5 w-5" />
            </button>
          </div>

          <slot></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>
