<script setup>
defineProps({
  stats: {
    type: Object,
    required: true
  }
})

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(amount)
}
</script>

<template>
  <div class="grid grid-cols-3 gap-3">
    <div class="rounded-2xl bg-green-50 p-3 text-center ring-1 ring-green-100">
      <p class="text-xs font-medium text-green-600 uppercase tracking-wider">In</p>
      <p class="mt-1 text-lg font-bold text-green-700 truncate">{{ formatCurrency(stats.totalIn) }}</p>
    </div>
    <div class="rounded-2xl bg-red-50 p-3 text-center ring-1 ring-red-100">
      <p class="text-xs font-medium text-red-600 uppercase tracking-wider">Out</p>
      <p class="mt-1 text-lg font-bold text-red-700 truncate">{{ formatCurrency(stats.totalOut) }}</p>
    </div>
    <div class="rounded-2xl bg-indigo-50 p-3 text-center ring-1 ring-indigo-100">
      <p class="text-xs font-medium text-indigo-600 uppercase tracking-wider">Net</p>
      <p class="mt-1 text-lg font-bold text-indigo-700 truncate">{{ formatCurrency(stats.netBalance) }}</p>
    </div>
  </div>
</template>
