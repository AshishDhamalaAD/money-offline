<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { onClickOutside } from '@vueuse/core'

const props = defineProps({
    modelValue: [String, Number],
    options: {
        type: Array,
        default: () => []
    },
    label: String,
    placeholder: String,
    error: String,
    required: Boolean,
    limit: {
        type: Number,
        default: 20
    }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const searchQuery = ref('')
const containerRef = ref(null)
const inputRef = ref(null)

// Find selected option label
const selectedLabel = computed(() => {
    const option = props.options.find(o => o.value === props.modelValue)
    return option ? option.label : ''
})

// Filter options
const filteredOptions = computed(() => {
    let options = props.options
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        options = options.filter(option =>
            option.label.toLowerCase().includes(query)
        )
        // When searching, show all matching results (no limit)
        return options
    }
    // No search query: limit displayed options for performance
    return options.slice(0, props.limit)
})

function open() {
    isOpen.value = true
    searchQuery.value = '' // Reset search on open? Or keep it? Let's reset to show all, or show current selection if we want.
    // Better UX: if has value, show all. If typing, filter.
    nextTick(() => {
        inputRef.value?.focus()
    })
}

function close() {
    isOpen.value = false
    searchQuery.value = ''
}

function select(option) {
    emit('update:modelValue', option.value)
    close()
}

onClickOutside(containerRef, close)

// When modelValue changes externally, we don't need to do much as selectedLabel is computed
</script>

<template>
    <div class="flex flex-col gap-1.5"
         ref="containerRef">
        <label v-if="label"
               class="text-sm font-medium text-gray-700 ml-1">
            {{ label }} <span v-if="required"
                  class="text-red-500">*</span>
        </label>

        <div class="relative">
            <!-- Trigger / Display -->
            <div @click="open"
                 :class="[
                    'w-full rounded-sm border-gray-200 bg-gray-50 px-4 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500',
                    { 'border-red-500': error, 'text-gray-400': !modelValue && !selectedLabel, 'text-gray-900': modelValue || selectedLabel }
                ]">
                {{ selectedLabel || placeholder || 'Select...' }}
            </div>

            <!-- Dropdown -->
            <div v-if="isOpen"
                 class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                <!-- Search Input -->
                <div class="p-2 border-b border-gray-100">
                    <input ref="inputRef"
                           v-model="searchQuery"
                           type="text"
                           class="w-full rounded-sm bg-gray-50 px-3 py-1.5 text focus:outline-none focus:ring-1 focus:ring-indigo-500"
                           placeholder="Search..." />
                </div>

                <!-- Options List -->
                <ul class="max-h-60 overflow-auto py-1">
                    <li v-if="filteredOptions.length === 0"
                        class="px-4 py-2 text-gray-500 text-center">
                        No results found
                    </li>
                    <li v-for="option in filteredOptions"
                        :key="option.value"
                        @click="select(option)"
                        :class="[
                            'cursor-pointer px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600',
                            { 'bg-indigo-50 text-indigo-600 font-medium': option.value === modelValue }
                        ]">
                        {{ option.label }}
                    </li>
                </ul>
            </div>
        </div>
        <span v-if="error"
              class="text-xs text-red-500 ml-1">{{ error }}</span>
    </div>
</template>
