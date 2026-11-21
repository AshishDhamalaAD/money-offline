<script setup>
defineProps({
  message: String,
  actionLabel: { type: String, default: 'Retry' },
  busy: Boolean,
})
defineEmits(['retry'])
</script>

<template>
  <div v-if="message" class="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
    <p role="alert">{{ message }}</p>
    <button v-if="actionLabel" type="button" class="mt-2 rounded-sm px-2 py-1 font-semibold underline disabled:opacity-50" :disabled="busy" @click="$emit('retry')">{{ actionLabel }}</button>
    <slot />
  </div>
</template>
