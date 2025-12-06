<script setup>
import { ref, computed, watch, nextTick } from "vue"
import { onClickOutside } from "@vueuse/core"
import IconX from "@/assets/icons/IconX.vue"

const props = defineProps({
  modelValue: [String, Number, Array],
  options: {
    type: Array,
    default: () => [],
  },
  label: String,
  placeholder: String,
  error: String,
  required: Boolean,
  limit: {
    type: Number,
    default: 20,
  },
  multiple: Boolean,
})

const emit = defineEmits(["update:modelValue"])

const isOpen = ref(false)
const searchQuery = ref("")
const containerRef = ref(null)
const inputRef = ref(null)

// Find selected option label
const selectedLabel = computed(() => {
  if (props.multiple) return "" // Handled by chips
  const option = props.options.find((o) => o.value === props.modelValue)
  return option ? option.label : ""
})

const selectedOptions = computed(() => {
  if (!props.multiple || !Array.isArray(props.modelValue)) return []
  return props.modelValue.map((val) => props.options.find((o) => o.value === val)).filter(Boolean)
})

// Filter options
const filteredOptions = computed(() => {
  let options = props.options
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    options = options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        (option.description && option.description.toLowerCase().includes(query))
    )
    // When searching, show all matching results (no limit)
    return options
  }
  // No search query: limit displayed options for performance
  return options.slice(0, props.limit)
})

function open() {
  isOpen.value = true
  searchQuery.value = ""
  nextTick(() => {
    inputRef.value?.focus()
  })
}

function close() {
  isOpen.value = false
  searchQuery.value = ""
}

function select(option) {
  if (props.multiple) {
    const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const index = current.indexOf(option.value)
    if (index === -1) {
      current.push(option.value)
    } else {
      current.splice(index, 1)
    }
    emit("update:modelValue", current)
    // Keep open for multiple selection
    inputRef.value?.focus()
  } else {
    emit("update:modelValue", option.value)
    close()
  }
}

function removeOption(value) {
  if (props.multiple && Array.isArray(props.modelValue)) {
    const current = props.modelValue.filter((v) => v !== value)
    emit("update:modelValue", current)
  }
}

function isSelected(value) {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(value)
  }
  return props.modelValue === value
}

onClickOutside(containerRef, close, {
  ignore: [inputRef],
})
</script>

<template>
  <div class="flex flex-col gap-1.5" ref="containerRef">
    <label v-if="label" class="text-sm font-medium text-gray-700 ml-1">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <!-- Trigger / Display -->
      <div
        @click="open"
        :class="[
          'w-full rounded-sm border-gray-200 bg-gray-50 px-4 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 flex justify-between items-center min-h-[42px]',
          {
            'border-red-500': error,
            'text-gray-400': !modelValue && !selectedLabel && selectedOptions.length === 0,
            'text-gray-900': modelValue || selectedLabel || selectedOptions.length > 0,
          },
        ]"
      >
        <div class="flex flex-wrap gap-1.5 overflow-hidden">
          <template v-if="multiple && selectedOptions.length > 0">
            <span
              v-for="opt in selectedOptions"
              :key="opt.value"
              class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
              @click.stop
            >
              {{ opt.label }}
              <button
                type="button"
                @click.stop="removeOption(opt.value)"
                class="ml-0.5 inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:bg-indigo-500 focus:text-white focus:outline-none"
              >
                <span class="sr-only">Remove {{ opt.label }}</span>
                <IconX class="h-2.5 w-2.5" />
              </button>
            </span>
          </template>
          <span v-else class="truncate">{{ selectedLabel || placeholder || "Select..." }}</span>
        </div>
        <svg class="h-5 w-5 text-gray-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <!-- Dropdown -->
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
      >
        <!-- Search Input -->
        <div class="p-2 border-b border-gray-100">
          <input
            ref="inputRef"
            v-model="searchQuery"
            type="text"
            class="w-full rounded-sm bg-gray-50 px-3 py-1.5 text focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Search..."
          />
        </div>

        <!-- Options List -->
        <ul class="max-h-60 overflow-auto py-1">
          <li v-if="filteredOptions.length === 0" class="px-4 py-2 text-gray-500 text-center">No results found</li>
          <li
            v-for="option in filteredOptions"
            :key="option.value"
            @click="select(option)"
            :class="[
              'cursor-pointer px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600',
              { 'bg-indigo-50 text-indigo-600 font-medium': isSelected(option.value) },
            ]"
          >
            <div class="flex flex-col">
              <span>{{ option.label }}</span>
              <span v-if="option.description" class="text-xs text-gray-400">{{ option.description }}</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
    <span v-if="error" class="text-xs text-red-500 ml-1">{{ error }}</span>
  </div>
</template>
