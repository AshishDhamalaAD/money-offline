<script setup>
import { ref, watch, computed } from 'vue'
import BaseInput from './ui/BaseInput.vue'
import SearchableSelect from './ui/SearchableSelect.vue'
import { roundAmount } from '../utils/dateUtils'

const props = defineProps({
    modelValue: {
        type: Object,
        required: true
    },
    products: {
        type: Array,
        default: () => []
    },
    productIndex: {
        type: Number,
        default: 0
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
    item.value.amount = roundAmount(qty * rate)
    emitUpdate()
}

function updateQuantity() {
    const rate = parseFloat(item.value.rate) || 0
    const amount = parseFloat(item.value.amount) || 0
    if (rate !== 0) {
        item.value.quantity = roundAmount(amount / rate)
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
        item.value.rate = parseFloat(product.rate) || 0
        updateAmount()
    } else {
        // If no product selected, reset
        item.value.productId = null
        item.value.name = ''
        emitUpdate()
    }
}
</script>

<template>
    <div :class="['relative py-4', productIndex === 0 ? '-mt-4' : '']">
        <button @click="$emit('remove')"
                class="absolute top-5 right-0 p-2 text-red-500 z-10">
            <svg class="h-5 w-5"
                 fill="none"
                 viewBox="0 0 24 24"
                 stroke="currentColor">
                <path stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <div class="grid grid-cols-1 gap-3">
            <!-- Product Select or Name Input -->
            <div>
                <SearchableSelect v-if="products.length > 0"
                                  :model-value="item.productId"
                                  @update:model-value="onProductSelect($event)"
                                  :options="products.map(p => ({ label: p.name, value: p.id }))"
                                  placeholder="Select Product" />
                <input v-else
                       v-model="item.name"
                       @input="emitUpdate"
                       placeholder="Product Name"
                       class="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div class="grid grid-cols-3 gap-2">
                <BaseInput v-model="item.quantity"
                           type="number"
                           step="0.01"
                           label="Qty"
                           placeholder="0"
                           @input="updateAmount" />
                <BaseInput v-model="item.rate"
                           type="number"
                           step="0.01"
                           label="Rate"
                           placeholder="0.00"
                           @input="updateAmount" />
                <BaseInput v-model="item.amount"
                           type="number"
                           step="0.01"
                           label="Amount"
                           placeholder="0.00"
                           @input="updateQuantity" />
            </div>
        </div>
    </div>
</template>
