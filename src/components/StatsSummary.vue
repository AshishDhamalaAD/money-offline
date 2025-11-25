<script setup>
import { formatCurrency } from "../utils/moneyUtils"

defineProps({
  stats: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-3">
      <!-- Opening Balance (if available) -->
      <div v-if="stats.openingBalance !== undefined" class="rounded-sm bg-gray-50 p-3 text-center ring-1 ring-gray-300">
        <p class="text-xs font-medium text-gray-600 uppercase tracking-wider">Opening Balance</p>
        <p :class="['mt-1 text-lg font-bold truncate', stats.openingBalance >= 0 ? 'text-green-700' : 'text-red-700']">
          {{ formatCurrency(Math.abs(stats.openingBalance), 0) }}
          <span v-if="stats.openingBalance < 0" class="text-xs">(Dr)</span>
        </p>
      </div>

      <!-- Closing Balance (if available) -->
      <div v-if="stats.closingBalance !== undefined" class="rounded-sm bg-blue-50 p-3 text-center ring-1 ring-blue-300">
        <p class="text-xs font-medium text-blue-600 uppercase tracking-wider">Closing Balance</p>
        <p :class="['mt-1 text-xl font-bold truncate', stats.closingBalance >= 0 ? 'text-green-700' : 'text-red-700']">
          {{ formatCurrency(Math.abs(stats.closingBalance), 0) }}
          <span v-if="stats.closingBalance < 0" class="text-xs">(Dr)</span>
        </p>
      </div>
    </div>

    <!-- Current Period Stats -->
    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-sm bg-green-50 p-3 text-center ring-1 ring-green-300">
        <p class="text-xs font-medium text-green-600 uppercase tracking-wider">In</p>
        <p class="mt-1 text-lg font-bold text-green-700 truncate">{{ formatCurrency(stats.totalIn, 0) }}</p>
      </div>
      <div class="rounded-sm bg-red-50 p-3 text-center ring-1 ring-red-300">
        <p class="text-xs font-medium text-red-600 uppercase tracking-wider">Out</p>
        <p class="mt-1 text-lg font-bold text-red-700 truncate">{{ formatCurrency(stats.totalOut, 0) }}</p>
      </div>
      <div class="rounded-sm bg-indigo-50 p-3 text-center ring-1 ring-indigo-300">
        <p class="text-xs font-medium text-indigo-600 uppercase tracking-wider">Net</p>
        <p class="mt-1 text-lg font-bold text-indigo-700 truncate">{{ formatCurrency(stats.netBalance, 0) }}</p>
      </div>
    </div>
  </div>
</template>
200
