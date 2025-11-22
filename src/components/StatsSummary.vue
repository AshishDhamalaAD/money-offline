<script setup>
defineProps({
    stats: {
        type: Object,
        required: true
    }
})

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        // minimumFractionDigits: 2,
        // maximumFractionDigits: 2 
    }).format(amount)
}
</script>

<template>
    <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
            <!-- Opening Balance (if available) -->
            <div v-if="stats.openingBalance !== undefined"
                 class="rounded-sm bg-gray-50 p-3 text-center ring-1 ring-gray-200">
                <p class="text-xs font-medium text-gray-600 uppercase tracking-wider">Opening Balance</p>
                <p
                   :class="['mt-1 text-lg font-bold truncate', stats.openingBalance >= 0 ? 'text-green-700' : 'text-red-700']">
                    {{ formatCurrency(Math.abs(stats.openingBalance)) }}
                    <span v-if="stats.openingBalance < 0"
                          class="text-xs">(Dr)</span>
                </p>
            </div>

            <!-- Closing Balance (if available) -->
            <div v-if="stats.closingBalance !== undefined"
                 class="rounded-sm bg-blue-50 p-3 text-center ring-1 ring-blue-200">
                <p class="text-xs font-medium text-blue-600 uppercase tracking-wider">Closing Balance</p>
                <p
                   :class="['mt-1 text-xl font-bold truncate', stats.closingBalance >= 0 ? 'text-green-700' : 'text-red-700']">
                    {{ formatCurrency(Math.abs(stats.closingBalance)) }}
                    <span v-if="stats.closingBalance < 0"
                          class="text-xs">(Dr)</span>
                </p>
            </div>
        </div>


        <!-- Current Period Stats -->
        <div class="grid grid-cols-3 gap-3">
            <div class="rounded-sm bg-green-50 p-3 text-center ring-1 ring-green-100">
                <p class="text-xs font-medium text-green-600 uppercase tracking-wider">In</p>
                <p class="mt-1 text-lg font-bold text-green-700 truncate">{{ formatCurrency(stats.totalIn) }}</p>
            </div>
            <div class="rounded-sm bg-red-50 p-3 text-center ring-1 ring-red-100">
                <p class="text-xs font-medium text-red-600 uppercase tracking-wider">Out</p>
                <p class="mt-1 text-lg font-bold text-red-700 truncate">{{ formatCurrency(stats.totalOut) }}</p>
            </div>
            <div class="rounded-sm bg-indigo-50 p-3 text-center ring-1 ring-indigo-100">
                <p class="text-xs font-medium text-indigo-600 uppercase tracking-wider">Net</p>
                <p class="mt-1 text-lg font-bold text-indigo-700 truncate">{{ formatCurrency(stats.netBalance) }}</p>
            </div>
        </div>
    </div>
</template>
