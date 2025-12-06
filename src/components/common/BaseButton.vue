<script setup>
import IconSpinner from "@/assets/icons/IconSpinner.vue"

defineProps({
  variant: {
    type: String,
    default: "primary",
    validator: (value) => ["primary", "secondary", "danger", "outline", "ghost"].includes(value),
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
  block: Boolean,
  loading: Boolean,
  disabled: Boolean,
})
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-sm font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-900',
      {
        'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-lg shadow-indigo-500/30':
          variant === 'primary',
        'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700':
          variant === 'secondary',
        'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-lg shadow-red-500/30':
          variant === 'danger',
        'border-2 border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800':
          variant === 'outline',
        'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800':
          variant === 'ghost',
        'px-3 py-1.5 text-sm': size === 'sm',
        'px-4 py-2.5 text-base': size === 'md',
        'px-6 py-3.5 text-lg': size === 'lg',
        'w-full': block,
        'opacity-50 cursor-not-allowed pointer-events-none': disabled || loading,
      },
    ]"
    :disabled="disabled || loading"
  >
    <IconSpinner class="-ml-1 mr-2 text-current" v-if="loading" />
    <slot />
  </button>
</template>
