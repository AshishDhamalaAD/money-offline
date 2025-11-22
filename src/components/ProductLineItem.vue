<script setup>
import { ref, watch, computed } from 'vue'
import BaseInput from './ui/BaseInput.vue'
import SearchableSelect from './ui/SearchableSelect.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  products: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'remove'])

const item = ref({ ...props.modelValue })

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  item.value = { ...newVal }
}, { deep: true })

// Auto-calc logic
function updateAmount() {
  const qty = parseFloat(item.value.quantity) || 0
  const rate = parseFloat(item.value.rate) || 0
  item.value.amount = qty * rate
  emitUpdate()
}

function updateRate() {
  const qty = parseFloat(item.value.quantity) || 0
  const amount = parseFloat(item.value.amount) || 0
  if (qty !== 0) {
    item.value.rate = amount / qty
  }
  emitUpdate()
}

function emitUpdate() {
  emit('update:modelValue', item.value)
}

function onProductSelect(productId) {
  const product = props.products.find(p => p.id === productId)
  if (product) {
    item.value.productId = productId
    item.value.name = product.name
    item.value.rate = product.rate
    updateAmount()
  }
}
</script>

<template>
  <div class="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
    <div class="flex justify-between items-start mb-2">
      <h4 class="text-sm font-medium text-gray-700">Item</h4>
      <button @click="$emit('remove')" class="text-red-500 hover:text-red-700">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <div class="grid grid-cols-1 gap-3">
      <!-- Product Select or Name Input -->
      <div>
        <SearchableSelect 
          v-if="products.length > 0"
          :model-value="item.productId"
          @update:model-value="onProductSelect($event)"
          :options="products.map(p => ({ label: p.name, value: p.id }))"
          placeholder="Select Product"
        />
        <input 
          v-else
          v-model="item.name"
          @input="emitUpdate"
          placeholder="Product Name"
          class="w-full rounded-lg border border-gray-300 bg-white text-sm px-4 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div class="grid grid-cols-3 gap-2">
        <BaseInput 
          v-model="item.quantity" 
          type="number" 
          label="Qty"
          placeholder="0" 
          @input="updateAmount"
          class="bg-white border-gray-300 shadow-sm"
        />
        <BaseInput 
          v-model="item.rate" 
          type="number" 
          label="Rate"
          placeholder="0.00" 
          @input="updateAmount"
          class="bg-white border-gray-300 shadow-sm"
        />
        <BaseInput 
          v-model="item.amount" 
          type="number" 
          label="Amount"
          placeholder="0.00" 
          @input="updateRate"
          class="bg-white border-gray-300 shadow-sm"
        />
      </div>
    </div>
  </div>
</template>
