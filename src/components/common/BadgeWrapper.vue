<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="relative">
    <slot />
    <span
      class="absolute top-1 left-1 z-10 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold leading-none select-none bg-indigo-600 text-white shadow ring-2 ring-white dark:ring-gray-900"
      >{{ label }}</span
    >
  </div>
</template>
