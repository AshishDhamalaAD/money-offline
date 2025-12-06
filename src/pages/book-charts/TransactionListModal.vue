<script setup>
import { computed } from "vue"
import BaseModal from "@/components/common/BaseModal.vue"
import BaseTable from "@/components/common/BaseTable.vue"
import { formatCurrency } from "@/utils/moneyUtils"
import { useCategoryStore } from "@/store/categoryStore"
import { formatDate } from "@/utils/dateUtils"

const props = defineProps({
  show: Boolean,
  title: String,
  transactions: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(["close"])

const categoryStore = useCategoryStore()

function getCategoryName(id) {
  const cat = categoryStore.categories.find((c) => c.id === id)
  return cat ? cat.name : "-"
}

const columns = [
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "rate", label: "Rate", align: "right", format: (val) => (val ? formatCurrency(val) : "-") },
  { key: "amount", label: "Amount", align: "right", format: (val) => formatCurrency(val) },
]

const flatData = computed(() => {
  const sorted = [...props.transactions].sort((a, b) => new Date(b.date) - new Date(a.date))
  const flat = []

  sorted.forEach((t) => {
    if (t.products && t.products.length > 1) {
      // Header row
      flat.push({
        ...t,
        rowType: "header",
        displayDate: t.date,
        displayDescription: t.description || "Transaction",
        itemCount: t.products.length,
      })
      // Product rows
      t.products.forEach((p) => {
        flat.push({
          ...p,
          id: `prod-${t.id}-${p.name}`, // Unique ID for key
          rowType: "product",
          date: "", // Empty date for product rows
          description: p.name,
          rate: p.rate,
          amount: p.amount,
          type: t.type, // Inherit type for color
        })
      })
    } else {
      // Single row
      const product = t.products && t.products.length === 1 ? t.products[0] : null
      flat.push({
        ...t,
        rowType: "single",
        displayDate: t.date,
        displayDescription: t.description || (product ? product.name : "-"),
        rate: product ? product.rate : null,
      })
    }
  })

  return flat
})
</script>

<template>
  <BaseModal :show="show" :title="title || 'Transactions'" @close="emit('close')">
    <div class="max-h-[60vh] overflow-y-auto">
      <BaseTable :columns="columns" :data="flatData" :page-size="50">
        <template #cell-date="{ row }">
          <span v-if="row.rowType !== 'product'" class="whitespace-nowrap text-gray-500">
            {{ formatDate(row.displayDate) }}
          </span>
        </template>

        <template #cell-description="{ row }">
          <!-- Header Row -->
          <div v-if="row.rowType === 'header'" class="font-medium text-gray-900">
            {{ row.displayDescription }}
            <span class="text-xs text-gray-500 font-normal ml-1">({{ row.itemCount }} items)</span>
          </div>

          <!-- Product Row -->
          <div v-else-if="row.rowType === 'product'" class="pl-4 text-gray-600 flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            {{ row.description }}
          </div>

          <!-- Single Row -->
          <div v-else>
            <div class="text-gray-900">{{ row.displayDescription }}</div>
            <div class="text-xs text-gray-500" v-if="row.category_ids && row.category_ids.length">
              {{ row.category_ids.map(getCategoryName).join(", ") }}
            </div>
          </div>
        </template>

        <template #cell-rate="{ row }">
          <span v-if="row.rate" class="text-gray-500 text-xs">
            {{ formatCurrency(row.rate) }}
          </span>
        </template>

        <template #cell-amount="{ row }">
          <span
            class="font-medium"
            :class="{
              'text-green-600': row.type === 'in',
              'text-red-600': row.type === 'out',
              'font-bold': row.rowType === 'header',
            }"
          >
            {{ row.type === "in" ? "+" : "-" }}{{ formatCurrency(row.amount) }}
          </span>
        </template>
      </BaseTable>
    </div>
    <div class="flex justify-end mt-4">
      <button
        @click="emit('close')"
        class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
      >
        Close
      </button>
    </div>
  </BaseModal>
</template>
