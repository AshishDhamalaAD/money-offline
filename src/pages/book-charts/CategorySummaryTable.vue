<script setup>
import { computed, ref, watch } from "vue"
import { useProductStore } from "@/store/productStore"
import { useCategoryStore } from "@/store/categoryStore"
import BaseTable from "@/components/common/BaseTable.vue"
import { formatCurrency } from "@/utils/moneyUtils"
import DateRangeTabs from "@/components/common/DateRangeTabs.vue"
import { filterByDateRange } from "@/utils/dateUtils"
import TransactionListModal from "@/pages/book-charts/TransactionListModal.vue"

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

const productStore = useProductStore()
const categoryStore = useCategoryStore()

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
    // Strategy:
    // 1. If transaction has products, aggregate from products (using product -> category mapping)
    // 2. If transaction has NO products, aggregate from transaction categories

    if (t.products && t.products.length > 0) {
      t.products.forEach((p) => {
        // Find product to get category
        const product = productStore.products.find((prod) => prod.id === p.product_id)
        const categoryId = product?.category_id

        // If product has no category, we might want to group under "Uncategorized" or skip
        // Let's group under "Uncategorized" if ID is missing
        const catId = categoryId || "uncategorized"

        if (!map.has(catId)) {
          let catName = "Uncategorized"
          if (categoryId) {
            const cat = categoryStore.categories.find((c) => c.id === categoryId)
            if (cat) catName = cat.name
          }

          map.set(catId, {
            id: catId,
            name: catName,
            quantity: 0,
            amount: 0,
          })
        }

        const item = map.get(catId)
        item.quantity += parseFloat(p.quantity) || 0
        item.amount += parseFloat(p.amount) || 0
      })
    } else {
      // No categories either
      const catId = "uncategorized"
      if (!map.has(catId)) {
        map.set(catId, {
          id: catId,
          name: "Uncategorized",
          quantity: 0,
          amount: 0,
        })
      }
      const item = map.get(catId)
      item.amount += parseFloat(t.amount) || 0
    }
  })

  return Array.from(map.values())
})

const columns = [
  { key: "name", label: "Name", sortable: true },
  {
    key: "quantity",
    label: "Quantity",
    sortable: true,
    align: "right",
    format: (val) => (val > 0 ? formatCurrency(val) : "-"),
  },
  { key: "amount", label: "Amount", sortable: true, align: "right", format: (val) => formatCurrency(val) },
]

// Modal Logic
const showModal = ref(false)
const selectedCategory = ref(null)
const selectedTransactions = ref([])

function handleRowClick(row) {
  selectedCategory.value = row
  // Filter transactions that contain this category and match the current date range
  selectedTransactions.value = filteredTransactions.value
    .filter((t) => {
      if (row.id === "uncategorized") {
        return !t.category_ids || t.category_ids.length === 0
      }
      // Check if transaction has this category directly or via products
      const hasDirectCategory = t.category_ids && t.category_ids.includes(row.id)
      const hasProductCategory =
        t.products &&
        t.products.some((p) => {
          const product = productStore.products.find((prod) => prod.id === p.product_id)
          return product && product.category_id === row.id
        })

      return hasDirectCategory || hasProductCategory
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
      <template #title> Category Wise Summary </template>

      <template #filters>
        <DateRangeTabs v-model="localFilter" v-model:start-date="localStartDate" v-model:end-date="localEndDate" />
      </template>
    </BaseTable>

    <TransactionListModal
      :show="showModal"
      :title="selectedCategory?.name"
      :transactions="selectedTransactions"
      @close="showModal = false"
    />
  </div>
</template>
