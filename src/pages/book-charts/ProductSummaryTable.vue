<script setup>
import { computed, ref, watch } from "vue"
import BaseTable from "@/components/common/BaseTable.vue"
import { formatCurrency } from "@/utils/moneyUtils"
import DateRangeTabs from "@/components/common/DateRangeTabs.vue"
import { filterByDateRange } from "@/utils/dateUtils"
import TransactionListModal from "@/pages/book-charts/TransactionListModal.vue"
import { useCategoryStore } from "@/store/categoryStore"

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

const tableRef = ref(null)

watch([localFilter, localStartDate, localEndDate], () => {
  tableRef.value?.resetPage()
})

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
            id: id, // Store ID for lookup
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
          id: id,
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

// Modal Logic
const showModal = ref(false)
const selectedProduct = ref(null)
const selectedTransactions = ref([])
const categoryStore = useCategoryStore()

function handleRowClick(row) {
  selectedProduct.value = row
  // Filter transactions that contain this product and match the current date range
  selectedTransactions.value = filteredTransactions.value
    .filter((t) => {
      if (row.id === "uncategorized") {
        return !t.products || t.products.length === 0
      }
      // Check if transaction has this product
      return t.products && t.products.some((p) => p.product_id === row.id || p.name === row.name)
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  showModal.value = true
}
</script>

<template>
  <div class="space-y-4">
    <BaseTable
      ref="tableRef"
      :columns="columns"
      :data="summary"
      :default-sort="{ key: 'amount', direction: 'desc' }"
      @row-click="handleRowClick"
    >
      <template #title> Product Wise Summary </template>

      <template #filters>
        <DateRangeTabs v-model="localFilter" v-model:start-date="localStartDate" v-model:end-date="localEndDate" />
      </template>
    </BaseTable>

    <TransactionListModal
      :show="showModal"
      :title="selectedProduct?.name"
      :transactions="selectedTransactions"
      @close="showModal = false"
    />
  </div>
</template>
