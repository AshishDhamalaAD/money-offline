<script setup>
defineProps({
    modelValue: [String, Number],
    label: String,
    type: {
        type: String,
        default: 'text'
    },
    placeholder: String,
    error: String,
    id: {
        type: String,
        default: () => 'input-' + Math.random().toString(36).substr(2, 9)
    },
    required: Boolean
})

defineEmits(['update:modelValue'])
</script>

<template>
    <div class="flex flex-col gap-1.5">
        <label v-if="label"
               :for="id"
               class="text-sm font-medium text-gray-700 ml-1">
            {{ label }} <span v-if="required"
                  class="text-red-500">*</span>
        </label>
        <textarea v-if="type === 'textarea'"
                  :id="id"
                  :value="modelValue"
                  @input="$emit('update:modelValue', $event.target.value)"
                  :placeholder="placeholder"
                  rows="3"
                  :class="[
                    'w-full max-w-full rounded-sm border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y',
                    { 'border-red-500 focus:border-red-500 focus:ring-red-500': error }
                ]"></textarea>
        <input v-else
               :id="id"
               :type="type"
               :value="modelValue"
               @input="$emit('update:modelValue', $event.target.value)"
               :placeholder="placeholder"
               :class="[
                'w-full max-w-full rounded-sm border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500',
                { 'border-red-500 focus:border-red-500 focus:ring-red-500': error }
            ]" />
        <span v-if="error"
              class="text-xs text-red-500 ml-1">{{ error }}</span>
    </div>
</template>
