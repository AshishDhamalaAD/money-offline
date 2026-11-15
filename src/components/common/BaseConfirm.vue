<script setup>
import BaseBottomSheet from "@/components/common/BaseBottomSheet.vue"
import BaseButton from "@/components/common/BaseButton.vue"

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "Are you sure?",
  },
  message: {
    type: String,
    default: "",
  },
  confirmLabel: {
    type: String,
    default: "Confirm",
  },
  cancelLabel: {
    type: String,
    default: "Cancel",
  },
  variant: {
    type: String,
    default: "primary",
    validator: (value) => ["primary", "danger"].includes(value),
  },
  loading: Boolean,
})

const emit = defineEmits(["update:modelValue", "confirm", "cancel"])

function close() {
  emit("update:modelValue", false)
}

function cancel() {
  emit("cancel")
  close()
}

function confirm() {
  emit("confirm")
}
</script>

<template>
  <BaseBottomSheet
    :model-value="modelValue"
    :title="title"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-5 pb-2">
      <p v-if="message" class="text-sm text-gray-600 dark:text-gray-300">
        {{ message }}
      </p>

      <slot />

      <div class="flex gap-3">
        <BaseButton variant="secondary" block @click="cancel">{{ cancelLabel }}</BaseButton>
        <BaseButton :variant="variant" block :loading="loading" @click="confirm">{{ confirmLabel }}</BaseButton>
      </div>
    </div>
  </BaseBottomSheet>
</template>
