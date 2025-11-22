<script setup>
defineProps({
    variant: {
        type: String,
        default: 'primary',
        validator: (value) => ['primary', 'secondary', 'danger', 'outline', 'ghost'].includes(value)
    },
    size: {
        type: String,
        default: 'md',
        validator: (value) => ['sm', 'md', 'lg'].includes(value)
    },
    block: Boolean,
    loading: Boolean,
    disabled: Boolean
})
</script>

<template>
    <button :class="[
        'inline-flex items-center justify-center rounded-sm font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1',
        {
            'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-lg shadow-indigo-500/30': variant === 'primary',
            'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500': variant === 'secondary',
            'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-lg shadow-red-500/30': variant === 'danger',
            'border-2 border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-500': variant === 'outline',
            'text-gray-600 hover:bg-gray-100 hover:text-gray-900': variant === 'ghost',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2.5 text-base': size === 'md',
            'px-6 py-3.5 text-lg': size === 'lg',
            'w-full': block,
            'opacity-50 cursor-not-allowed pointer-events-none': disabled || loading
        }
    ]"
            :disabled="disabled || loading">
        <svg v-if="loading"
             class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
             xmlns="http://www.w3.org/2000/svg"
             fill="none"
             viewBox="0 0 24 24">
            <circle class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"></circle>
            <path class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
        </svg>
        <slot />
    </button>
</template>
