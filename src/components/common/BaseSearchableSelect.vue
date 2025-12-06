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
  hideSelected: {
    type: Boolean,
    default: true,
  },
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

const hasSelection = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.length > 0
  }
  return props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== ""
})

// Filter options
const filteredOptions = computed(() => {
  let options = props.options

  // 1. Hide selected options if configured (default: true)
  if (props.hideSelected) {
    if (props.multiple && Array.isArray(props.modelValue)) {
      options = options.filter((o) => !props.modelValue.includes(o.value))
    } else if (!props.multiple && props.modelValue) {
      options = options.filter((o) => o.value !== props.modelValue)
    }
  }

  // 2. Search filtering
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

  // 3. Limit (only if no search)
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

function clearSelection() {
  if (props.multiple) {
    emit("update:modelValue", [])
  } else {
    emit("update:modelValue", null)
  }
  // Keep open to allow re-selection if desired, or focus input
  nextTick(() => {
    inputRef.value?.focus()
  })
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
    <label v-if="label" class="text-sm font-medium text-gray-700 ml-1 dark:text-gray-200">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <!-- Trigger / Display -->
      <div
        @click="open"
        :class="[
          'w-full rounded-sm border-gray-200 bg-gray-50 px-4 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 flex justify-between items-center min-h-[42px] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
          {
            'border-red-500': error,
            'text-gray-400 dark:text-gray-500': !modelValue && !selectedLabel && selectedOptions.length === 0,
            'text-gray-900 dark:text-gray-100': modelValue || selectedLabel || selectedOptions.length > 0,
          },
        ]"
      >
        <div class="flex flex-wrap gap-1.5 overflow-hidden">
          <template v-if="multiple && selectedOptions.length > 0">
            <span
              v-for="opt in selectedOptions"
              :key="opt.value"
              class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-100"
              @click.stop
            >
              {{ opt.label }}
              <button
                type="button"
                @click.stop="removeOption(opt.value)"
                class="ml-0.5 inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:bg-indigo-500 focus:text-white focus:outline-none dark:hover:bg-indigo-800"
              >
                <span class="sr-only">Remove {{ opt.label }}</span>
                <IconX class="h-2.5 w-2.5" />
              </button>
            </span>
          </template>
          <span v-else class="truncate">{{ selectedLabel || placeholder || "Select..." }}</span>
        </div>

        <!-- Icons: Clear vs Chevron -->
        <div class="flex items-center ml-2 shrink-0">
          <!-- Clear Button (Visible when Open + Has Selection) -->
          <button
            v-if="hasSelection"
            @click.stop="clearSelection"
            class="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            title="Clear All"
          >
            <IconX class="h-4 w-4" />
          </button>

          <!-- Dropdown Chevron -->
          <svg
            v-else
            class="h-5 w-5 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Dropdown -->
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:bg-gray-900 dark:border-gray-700 dark:shadow-black/30"
      >
        <!-- Search Input -->
        <div class="p-2 border-b border-gray-100 dark:border-gray-800">
          <input
            ref="inputRef"
            v-model="searchQuery"
            type="text"
            class="w-full rounded-sm bg-gray-50 px-3 py-1.5 text focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="Search..."
          />
        </div>

        <!-- Options List -->
        <ul class="max-h-60 overflow-auto py-1">
          <li v-if="filteredOptions.length === 0" class="px-4 py-2 text-gray-500 text-center dark:text-gray-400">
            No results found
          </li>
          <li
            v-for="option in filteredOptions"
            :key="option.value"
            @click="select(option)"
            :class="[
              'cursor-pointer px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-200',
              {
                'bg-indigo-50 text-indigo-600 font-medium dark:bg-indigo-900/50 dark:text-indigo-100': isSelected(
                  option.value
                ),
              },
            ]"
          >
            <div class="flex flex-col">
              <span>{{ option.label }}</span>
              <span v-if="option.description" class="text-xs text-gray-400 dark:text-gray-500">{{
                option.description
              }}</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
    <span v-if="error" class="text-xs text-red-500 ml-1">{{ error }}</span>
  </div>
</template>
