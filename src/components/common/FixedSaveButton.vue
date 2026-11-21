<script setup>
import BaseButton from "@/components/common/BaseButton.vue"

defineProps({ loading: Boolean, disabled: Boolean })
defineEmits(["click"])
</script>

<template>
  <div>
    <!-- Spacer for fixed button, including the device safe area -->
    <div class="h-safe-24"></div>

    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pt-4 pb-safe-8 px-4 z-30 dark:bg-gray-900 dark:border-gray-800">
      <BaseButton :loading="loading" :disabled="disabled" class="w-full" @click="$emit('click')">Save</BaseButton>
    </div>
  </div>
</template>
