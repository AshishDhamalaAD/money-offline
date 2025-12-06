<script setup>
import { formatCurrency } from "@/utils/moneyUtils"

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
      <div
        v-if="stats.openingBalance !== undefined"
        class="rounded-sm bg-gray-50 p-3 text-center ring-1 ring-gray-300 dark:bg-gray-900 dark:ring-gray-700"
      >
        <p class="text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-gray-300">Opening Balance</p>
        <p
          :class="[
            'mt-1 text-lg font-bold truncate',
            stats.openingBalance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
          ]"
        >
          {{ formatCurrency(Math.abs(stats.openingBalance), 0) }}
          <span v-if="stats.openingBalance < 0" class="text-xs">(Dr)</span>
        </p>
      </div>

      <!-- Closing Balance (if available) -->
      <div
        v-if="stats.closingBalance !== undefined"
        class="rounded-sm bg-blue-50 p-3 text-center ring-1 ring-blue-300 dark:bg-blue-900/30 dark:ring-blue-800"
      >
        <p class="text-xs font-medium text-blue-600 uppercase tracking-wider dark:text-blue-200">Closing Balance</p>
        <p
          :class="[
            'mt-1 text-xl font-bold truncate',
            stats.closingBalance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
          ]"
        >
          {{ formatCurrency(Math.abs(stats.closingBalance), 0) }}
          <span v-if="stats.closingBalance < 0" class="text-xs">(Dr)</span>
        </p>
      </div>
    </div>

    <!-- Current Period Stats -->
    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-sm bg-green-50 p-3 text-center ring-1 ring-green-300 dark:bg-green-900/30 dark:ring-green-800">
        <p class="text-xs font-medium text-green-600 uppercase tracking-wider dark:text-green-200">In</p>
        <p class="mt-1 text-lg font-bold text-green-700 truncate dark:text-green-300">
          {{ formatCurrency(stats.totalIn, 0) }}
        </p>
      </div>
      <div class="rounded-sm bg-red-50 p-3 text-center ring-1 ring-red-300 dark:bg-red-900/30 dark:ring-red-800">
        <p class="text-xs font-medium text-red-600 uppercase tracking-wider dark:text-red-200">Out</p>
        <p class="mt-1 text-lg font-bold text-red-700 truncate dark:text-red-300">
          {{ formatCurrency(stats.totalOut, 0) }}
        </p>
      </div>
      <div
        class="rounded-sm bg-indigo-50 p-3 text-center ring-1 ring-indigo-300 dark:bg-indigo-900/30 dark:ring-indigo-700"
      >
        <p class="text-xs font-medium text-indigo-600 uppercase tracking-wider dark:text-indigo-200">Net</p>
        <p class="mt-1 text-lg font-bold text-indigo-700 truncate dark:text-indigo-200">
          {{ formatCurrency(stats.netBalance, 0) }}
        </p>
      </div>
    </div>
  </div>
</template>
200
