<script setup>
import { ref, computed } from "vue"
import IconEyeSlash from "@/assets/icons/IconEyeSlash.vue"
import IconEye from "@/assets/icons/IconEye.vue"

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  type: {
    type: String,
    default: "text",
  },
  placeholder: String,
  error: String,
  id: {
    type: String,
    default: () => "input-" + Math.random().toString(36).substr(2, 9),
  },
  required: Boolean,
  readonly: Boolean,
})

defineEmits(["update:modelValue"])

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === "password" && showPassword.value) {
    return "text"
  }
  return props.type
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-sm font-medium text-gray-700 dark:text-gray-200 ml-1">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    <textarea
      v-if="type === 'textarea'"
      :id="id"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :placeholder="placeholder"
      rows="3"
      :readonly="readonly"
      :class="[
        'w-full max-w-full rounded-sm border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:bg-gray-900',
        { 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500 dark:focus:bg-gray-900': error },
      ]"
    ></textarea>
    <div v-else :class="['relative', { 'flex items-center gap-1': $slots['after-input'] }]">
      <input
        :id="id"
        :type="inputType"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        :placeholder="placeholder"
        :readonly="readonly"
        :class="[
          'w-full max-w-full rounded-sm border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:bg-gray-900 overflow-x-hidden',
          {
            'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500 dark:focus:bg-gray-900': error,
          },
          { 'pr-10': type === 'password' },
          { 'flex-1': $slots['after-input'] },
        ]"
      />
      <slot name="after-input" />
      <button
        v-if="type === 'password'"
        type="button"
        @click="showPassword = !showPassword"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none dark:text-gray-300 dark:hover:text-gray-100"
      >
        <IconEyeSlash v-if="showPassword" />
        <IconEye v-else />
      </button>
    </div>
    <span v-if="error" class="text-xs text-red-500 ml-1">{{ error }}</span>
  </div>
</template>
