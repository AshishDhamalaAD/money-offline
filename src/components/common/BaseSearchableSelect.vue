<script setup>
import { ref, computed, watch, nextTick, useId, onUnmounted } from "vue"
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
  disabled: Boolean,
  id: String,
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
const triggerRef = ref(null)
const generatedId = useId()
const controlId = computed(() => props.id || generatedId)
const activeIndex = ref(0)
let tabCloseTimer
onUnmounted(() => clearTimeout(tabCloseTimer))
const optionId = index => `${controlId.value}-option-${index}`
function onKeydown(event) {
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    event.stopPropagation()
    close(true)
  } else if (event.key === 'Tab') {
    // Let the browser move focus before removing the focused search input.
    clearTimeout(tabCloseTimer)
    tabCloseTimer = setTimeout(() => close(), 0)
  }
  else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    if (!isOpen.value) open()
    else if (event.key === 'Home') activeIndex.value = 0
    else if (event.key === 'End') activeIndex.value = filteredOptions.value.length - 1
    else activeIndex.value = Math.max(0, Math.min(filteredOptions.value.length - 1, activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1)))
    nextTick(() => document.getElementById(optionId(activeIndex.value))?.scrollIntoView({ block: 'nearest' }))
  } else if (event.key === 'Enter' && isOpen.value) {
    event.preventDefault()
    const option = filteredOptions.value[activeIndex.value]
    if (option) select(option)
  }
}

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

watch(filteredOptions, () => { activeIndex.value = 0 })

function open() {
  if (props.disabled) return
  isOpen.value = true
  searchQuery.value = ""
  nextTick(() => {
    inputRef.value?.focus()
  })
}

function close(restoreFocus = false) {
  isOpen.value = false
  searchQuery.value = ""
  if (restoreFocus === true) nextTick(() => triggerRef.value?.focus())
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
  }
  close(true)
}

function removeOption(value) {
  if (props.multiple && Array.isArray(props.modelValue)) {
    const current = props.modelValue.filter((v) => v !== value)
    emit("update:modelValue", current)
    nextTick(() => triggerRef.value?.focus())
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
    triggerRef.value?.focus()
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
    <label :id="`${controlId}-label`" :for="controlId" v-if="label" class="text-sm font-medium text-gray-700 ml-1 dark:text-gray-200">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <div class="relative flex min-h-[42px] items-center gap-2 rounded-sm bg-gray-50 px-4 py-2.5 dark:bg-gray-800">
        <button
          ref="triggerRef"
          :id="controlId"
          type="button"
          :disabled="disabled"
          class="absolute inset-0 w-full rounded-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-haspopup="listbox"
          :aria-expanded="isOpen"
          :aria-controls="isOpen ? `${controlId}-list` : undefined"
          :aria-labelledby="label ? `${controlId}-label ${controlId}-value` : `${controlId}-value`"
          :aria-invalid="error ? true : undefined"
          :aria-required="required"
          :aria-describedby="error ? `${controlId}-error` : undefined"
          @keydown="onKeydown"
          @click="isOpen ? close(true) : open()"
        >
          <span :id="`${controlId}-value`" class="sr-only">{{ multiple ? (selectedOptions.map(option => option.label).join(', ') || placeholder || 'Select...') : selectedLabel || placeholder || 'Select...' }}</span>
        </button>
        <!-- Keep chips inside the field, with remove buttons beside the trigger. -->
        <div class="pointer-events-none relative flex min-w-0 flex-1 flex-wrap gap-1.5">
          <template v-if="multiple && selectedOptions.length">
            <span
              v-for="option in selectedOptions"
              :key="option.value"
              class="inline-flex max-w-full items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-100"
            >
              <span class="truncate">{{ option.label }}</span>
              <button
                type="button"
                :disabled="disabled"
                :aria-label="`Remove ${option.label}`"
                class="pointer-events-auto inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 dark:hover:bg-indigo-800"
                @click.stop="removeOption(option.value)"
              >
                <IconX class="h-2.5 w-2.5" />
              </button>
            </span>
          </template>
          <span v-else :class="hasSelection ? 'text-gray-900 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'" class="truncate">{{ selectedLabel || placeholder || 'Select...' }}</span>
        </div>
        <button v-if="hasSelection" :disabled="disabled" type="button" :aria-label="`Clear ${label || 'selection'}`" class="relative shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white" @click.stop="clearSelection"><IconX class="h-4 w-4" /></button>
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
            role="combobox"
            aria-autocomplete="list"
            :aria-label="`Search ${label || placeholder || 'options'}`"
            :aria-expanded="isOpen"
            :aria-controls="`${controlId}-list`"
            :aria-activedescendant="filteredOptions.length ? optionId(activeIndex) : undefined"
            @keydown="onKeydown"
            v-model="searchQuery"
            type="text"
            class="w-full rounded-sm bg-gray-50 px-3 py-1.5 text focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="Search..."
          />
        </div>

        <!-- Options List -->
        <ul :id="`${controlId}-list`" role="listbox" :aria-label="label || placeholder || 'Options'" :aria-multiselectable="multiple || undefined" class="max-h-60 overflow-auto py-1">
          <li role="presentation" v-if="filteredOptions.length === 0" class="px-4 py-2 text-gray-500 text-center dark:text-gray-400">
            No results found
          </li>
          <li
            v-for="(option, index) in filteredOptions"
            :id="optionId(index)"
            role="option"
            :aria-selected="isSelected(option.value)"
            :key="option.value"
            @click="select(option)"
            :class="[
              'cursor-pointer px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-200',
              {
                'bg-indigo-50 text-indigo-600 font-medium dark:bg-indigo-900/50 dark:text-indigo-100': index === activeIndex || isSelected(option.value),
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
    <span :id="`${controlId}-error`" v-if="error" class="text-xs text-red-500 ml-1">{{ error }}</span>
  </div>
</template>
