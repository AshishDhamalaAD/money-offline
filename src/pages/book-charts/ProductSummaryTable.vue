<script setup>
import { computed, ref, watch } from "vue"
import BaseTable from "@/components/common/BaseTable.vue"
import { formatCurrency } from "@/utils/moneyUtils"
import DateRangeTabs from "@/components/common/DateRangeTabs.vue"
import { filterByDateRange } from "@/utils/dateUtils"

const props = defineProps({
  transactions: {
    type: Array,
    required: true,
  },
  globalFilter: {
    type: Object,
    default: () => ({ filter: "all", startDate: "", endDate: "" }),
  },
})

const localFilter = ref("month")
const localStartDate = ref("")
const localEndDate = ref("")

watch(
  () => props.globalFilter,
  (newVal) => {
    localFilter.value = newVal.filter
    localStartDate.value = newVal.startDate
    localEndDate.value = newVal.endDate
  },
  { deep: true }
)

const filteredTransactions = computed(() => {
  return filterByDateRange(props.transactions, "date", localStartDate.value, localEndDate.value)
})

const summary = computed(() => {
  const map = new Map()

  filteredTransactions.value.forEach((t) => {
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
    } else {
      const id = "uncategorized"
      if (!map.has(id)) {
        map.set(id, {
          name: "Uncategorized",
          quantity: 0,
          amount: 0,
        })
      }
      const item = map.get(id)
      item.amount += parseFloat(t.amount) || 0
    }
  })

  return Array.from(map.values())
})

const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "quantity", label: "Quantity", sortable: true, align: "right", format: (val) => formatCurrency(val) },
  { key: "amount", label: "Amount", sortable: true, align: "right", format: (val) => formatCurrency(val) },
]
</script>

<template>
  <div class="space-y-4">
    <BaseTable :columns="columns" :data="summary" :default-sort="{ key: 'amount', direction: 'desc' }">
      <template #title> Product Wise Summary </template>

      <template #filters>
        <DateRangeTabs v-model="localFilter" v-model:start-date="localStartDate" v-model:end-date="localEndDate" />
      </template>
    </BaseTable>
  </div>
</template>
