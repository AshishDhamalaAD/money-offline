<script setup>
import { computed } from "vue"
import BaseTable from "@/components/common/BaseTable.vue"
import { formatCurrency } from "@/utils/moneyUtils"

const props = defineProps({
  transactions: {
    type: Array,
    required: true,
  },
})

const summary = computed(() => {
  const map = new Map()

  props.transactions.forEach((t) => {
    if (t.products && t.products.length > 0) {
      t.products.forEach((p) => {
        const id = p.product_id || p.name // Fallback to name if no ID (ad-hoc product)
        if (!id) return

        if (!map.has(id)) {
          map.set(id, {
            name: p.name || "Unknown Product",
            quantity: 0,
            amount: 0,
          })
        }

        const item = map.get(id)
        item.quantity += parseFloat(p.quantity) || 0
        item.amount += parseFloat(p.amount) || 0
      })
    }
  })

  return Array.from(map.values())
})

const columns = [
  { key: "name", label: "Product Name", sortable: true },
  { key: "quantity", label: "Total Quantity", sortable: true, align: "right", format: (val) => formatCurrency(val, 2) },
  { key: "amount", label: "Total Amount", sortable: true, align: "right", format: (val) => formatCurrency(val) },
]
</script>

<template>
  <BaseTable :columns="columns" :data="summary" :default-sort="{ key: 'amount', direction: 'desc' }">
    <template #title>Product Wise Summary (Cash Out)</template>
  </BaseTable>
</template>
