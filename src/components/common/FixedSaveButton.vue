<script setup>
import BaseButton from "@/components/common/BaseButton.vue"

defineEmits(["click"])
</script>

<template>
  <div>
    <!-- Spacer for fixed button -->
    <div class="h-24"></div>

    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pt-4 pb-8 px-4 z-30 dark:bg-gray-900 dark:border-gray-800">
      <BaseButton class="w-full" @click="$emit('click')">Save</BaseButton>
    </div>
  </div>
</template>
