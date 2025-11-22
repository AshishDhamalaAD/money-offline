<script setup>
import { computed } from 'vue'

const props = defineProps({
  transaction: {
    type: Object,
    required: true
  }
})

const formattedDate = computed(() => {
  return new Date(props.transaction.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const formattedAmount = computed(() => {
  return new Intl.NumberFormat('en-IN', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(props.transaction.amount)
})
</script>

<template>
  <div class="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50">
    <div class="flex items-center gap-3">
      <div 
        :class="[
          'flex h-10 w-10 items-center justify-center rounded-full',
          transaction.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        ]"
      >
        <svg v-if="transaction.type === 'in'" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
        </svg>
        <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
        </svg>
      </div>
      <div>
        <p class="font-medium text-gray-900">{{ transaction.description || 'No Description' }}</p>
        <p class="text-xs text-gray-500">{{ formattedDate }}</p>
      </div>
    </div>
    <div 
      :class="[
        'text-lg font-bold',
        transaction.type === 'in' ? 'text-green-600' : 'text-red-600'
      ]"
    >
      {{ transaction.type === 'in' ? '+' : '-' }}{{ formattedAmount }}
    </div>
  </div>
</template>
