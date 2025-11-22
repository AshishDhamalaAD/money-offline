<script setup>
import { computed, onMounted } from 'vue'
import { useMasterStore } from '../stores/masterStore'
import { formatTime } from '../utils/dateUtils'

const props = defineProps({
    transaction: {
        type: Object,
        required: true
    }
})

const formattedTime = computed(() => {
    return formatTime(props.transaction.date)
})

const masterStore = useMasterStore()

onMounted(() => {
    masterStore.watchBookData(props.transaction.book_id)
})

// Currency formatting function
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount || 0)
}

const formattedAmount = computed(() => formatCurrency(props.transaction.amount))

const category = computed(() => {
    return masterStore.categories.find(c => c.id === props.transaction.category_id)
})

const paymentMode = computed(() => {
    return masterStore.paymentModes.find(p => p.id === props.transaction.payment_mode_id)
})

const productsTotal = computed(() => {
    if (!props.transaction.products || props.transaction.products.length === 0) return 0
    return props.transaction.products.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
})

const discount = computed(() => parseFloat(props.transaction.discount) || 0)
const charge = computed(() => parseFloat(props.transaction.charge) || 0)

const hasCalculation = computed(() => {
    return props.transaction.type === 'out' && (discount.value > 0 || charge.value > 0)
})
</script>

<template>
    <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <!-- Row 1: Type + Category + Calculation -->
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <!-- Type Label -->
                <span v-if="paymentMode"
                      :class="[
                        'px-3 py-1 rounded-md text-xs font-medium',
                        'bg-orange-100 text-orange-700'
                    ]">
                    {{ paymentMode.name }}
                </span>

                <!-- Category Label -->
                <span v-if="category"
                      class="px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                    {{ category.name }}
                </span>
            </div>

            <!-- Calculation / Final Amount -->
            <div class="text-right">
                <div class="text-sm text-gray-600">
                    <span :class="transaction.type === 'in' ? 'text-green-600' : 'text-red-600'">{{
                        formatCurrency(productsTotal) }}</span>
                    <span v-if="discount > 0"
                          class="text-red-600"> - {{ formatCurrency(discount) }}</span>
                    <span v-if="charge > 0"
                          class="text-green-600"> + {{ formatCurrency(charge) }}</span>
                    <span v-if="productsTotal !== transaction.amount"
                          :class="transaction.type === 'in' ? 'text-green-600' : 'text-red-600'"> = {{ formattedAmount
                        }}</span>
                </div>
            </div>
        </div>

        <!-- Row 2: Product Items -->
        <div v-if="transaction.products && transaction.products.length > 0"
             class="space-y-1 mb-2">
            <div v-for="(product, index) in transaction.products"
                 :key="index"
                 class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-gray-700">
                    <span class="font-medium">{{ product.name }}</span>
                    <span v-if="product.quantity > 1"
                          class="text-gray-500">{{ product.quantity }} × {{ formatCurrency(product.rate) }}</span>
                </div>
                <span class="text-gray-900 font-medium">{{ formatCurrency(product.amount) }}</span>
            </div>
        </div>

        <!-- Row 3: Description + Time -->
        <div class="flex justify-between items-center gap-2">
            <span v-if="transaction.description"
                  class="text-xs text-gray-600 flex-1">{{ transaction.description }}</span>
            <span class="text-xs text-gray-500">{{ formattedTime }}</span>
        </div>
    </div>
</template>
