<script setup>
import { ref, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { useBookStore } from "@/store/bookStore"
import { useTransactionStore } from "@/store/transactionStore"
import { useCategoryStore } from "@/store/categoryStore"
import { useContactStore } from "@/store/contactStore"
import { usePaymentModeStore } from "@/store/paymentModeStore"
import { useProductStore } from "@/store/productStore"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseSearchableSelect from "@/components/common/BaseSearchableSelect.vue"
import LazyRender from "@/components/common/LazyRender.vue"
import TransactionsMonthChart from "@/pages/book-charts/TransactionsMonthChart.vue"
import TransactionsYearChart from "@/pages/book-charts/TransactionsYearChart.vue"
import TransactionsMonthBarChart from "@/pages/book-charts/TransactionsMonthBarChart.vue"
import ProductSummaryTable from "@/pages/book-charts/ProductSummaryTable.vue"
import CategorySummaryTable from "@/pages/book-charts/CategorySummaryTable.vue"
import IconFilter from "@/assets/icons/IconFilter.vue"
import IconX from "@/assets/icons/IconX.vue"
import ActiveFilterChips from "@/components/common/ActiveFilterChips.vue"
import DateRangeTabs from "@/components/common/DateRangeTabs.vue"

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const transactionStore = useTransactionStore()
const categoryStore = useCategoryStore()
const contactStore = useContactStore()
const paymentModeStore = usePaymentModeStore()
const productStore = useProductStore()

const book = ref(null)
const bookId = ref(null)
const showFilters = ref(false)

// Global Date Filter (Top Card)
const globalDateFilter = ref("all")
const globalStartDate = ref("")
const globalEndDate = ref("")

// Filters
const appliedFilters = ref({
  type: "out", // 'in' or 'out'
  includeCategoryIds: [],
  excludeCategoryIds: [],
  includeProductIds: [],
  excludeProductIds: [],
})

// Temporary filters for the filter card
const tempFilters = ref({
  type: "out",
  includeCategoryIds: [],
  excludeCategoryIds: [],
  includeProductIds: [],
  excludeProductIds: [],
})

onMounted(async () => {
  const bookIdParam = parseInt(route.params.bookId)
  if (!bookIdParam) return

  bookId.value = bookIdParam
  book.value = await bookStore.getBook(bookId.value)
  transactionStore.setBookId(bookId.value)

  categoryStore.watchCategories(bookId.value)
  paymentModeStore.watchPaymentModes(bookId.value)
  productStore.watchProducts(bookId.value)
})

function toggleFilters() {
  if (!showFilters.value) {
    // Open: copy applied to temp
    tempFilters.value = JSON.parse(JSON.stringify(appliedFilters.value))
  }
  showFilters.value = !showFilters.value
}

function applyFilters() {
  appliedFilters.value = JSON.parse(JSON.stringify(tempFilters.value))
  //   showFilters.value = false // Close filter card on apply
}

function resetFilters() {
  tempFilters.value = {
    type: "out",
    includeCategoryIds: [],
    excludeCategoryIds: [],
    includeProductIds: [],
    excludeProductIds: [],
  }
}

// Helper to clear specific filters from chips
function clearFilter(type) {
  // Not used directly, we render manual chips for arrays
}

// Computed property for "Base" transactions (Filtered by Type, Category, Product ONLY)
// Date filtering will be handled by individual charts/tables using globalDateFilter as initial state
const baseTransactions = computed(() => {
  let transactions = transactionStore.transactions.filter((t) => t.type === appliedFilters.value.type)

  // Include Categories
  if (appliedFilters.value.includeCategoryIds.length > 0) {
    transactions = transactions.filter((t) => {
      if (!t.category_ids || t.category_ids.length === 0) return false
      const transactionProductCategoryIds = t.products?.filter((p) => p.category_id)?.map((p) => p.category_id) || []
      return [...t.category_ids, ...transactionProductCategoryIds].some((id) =>
        appliedFilters.value.includeCategoryIds.includes(id)
      )
    })
  }

  // Exclude Categories
  if (appliedFilters.value.excludeCategoryIds.length > 0) {
    transactions = transactions.filter((t) => {
      if (!t.category_ids) return true
      const transactionProductCategoryIds = t.products?.filter((p) => p.category_id)?.map((p) => p.category_id) || []
      return ![...t.category_ids, ...transactionProductCategoryIds].some((id) =>
        appliedFilters.value.excludeCategoryIds.includes(id)
      )
    })
  }

  // Include Products
  if (appliedFilters.value.includeProductIds.length > 0) {
    transactions = transactions.filter((t) => {
      if (!t.products || t.products.length === 0) return false
      return t.products.some((p) => appliedFilters.value.includeProductIds.includes(p.product_id))
    })
  }

  // Exclude Products
  if (appliedFilters.value.excludeProductIds.length > 0) {
    transactions = transactions.filter((t) => {
      if (!t.products) return true
      return !t.products.some((p) => appliedFilters.value.excludeProductIds.includes(p.product_id))
    })
  }

  return transactions.sort((a, b) => new Date(a.date) - new Date(b.date))
})

// Global Date Filter Object to pass to children
const globalFilterObj = computed(() => ({
  filter: globalDateFilter.value,
  startDate: globalStartDate.value,
  endDate: globalEndDate.value,
}))

function removeCategory(id) {
  appliedFilters.value.includeCategoryIds = appliedFilters.value.includeCategoryIds.filter((c) => c !== id)
}
function removeProduct(id) {
  appliedFilters.value.includeProductIds = appliedFilters.value.includeProductIds.filter((p) => p !== id)
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="book?.name || 'Book Charts'" :back-route="{ name: 'book-details', params: { id: bookId } }">
    </PageHeader>

    <main class="p-4 space-y-6 pb-24">
      <!-- Top Filter Section -->
      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="font-semibold text-gray-800">Global Filters</h2>
          <button
            @click="toggleFilters"
            class="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <IconFilter class="w-4 h-4" />
            {{ showFilters ? "Hide Filters" : "Show Filters" }}
          </button>
        </div>

        <!-- Date Range Tabs (Global) -->
        <DateRangeTabs
          v-model="globalDateFilter"
          v-model:start-date="globalStartDate"
          v-model:end-date="globalEndDate"
        />

        <!-- Collapsible Advanced Filters -->
        <div v-if="showFilters" class="pt-4 border-t border-gray-100 space-y-4">
          <!-- Transaction Type -->
          <div class="flex rounded-sm bg-gray-100 p-1 w-full md:w-64">
            <button
              @click="tempFilters.type = 'in'"
              :class="[
                'flex-1 rounded-sm py-1.5 text-sm font-medium transition-all',
                tempFilters.type === 'in' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600',
              ]"
            >
              Cash In (+)
            </button>
            <button
              @click="tempFilters.type = 'out'"
              :class="[
                'flex-1 rounded-sm py-1.5 text-sm font-medium transition-all',
                tempFilters.type === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600',
              ]"
            >
              Cash Out (-)
            </button>
          </div>

          <!-- Categories -->
          <BaseSearchableSelect
            v-model="tempFilters.includeCategoryIds"
            label="Include Categories"
            multiple
            :options="categoryStore.categories.map((c) => ({ label: c.name, value: c.id }))"
            placeholder="Select categories to include"
          />
          <BaseSearchableSelect
            v-model="tempFilters.excludeCategoryIds"
            label="Exclude Categories"
            multiple
            :options="categoryStore.categories.map((c) => ({ label: c.name, value: c.id }))"
            placeholder="Select categories to exclude"
          />

          <!-- Products -->
          <BaseSearchableSelect
            v-model="tempFilters.includeProductIds"
            label="Include Products"
            multiple
            :options="productStore.products.map((p) => ({ label: p.name, value: p.id }))"
            placeholder="Select products to include"
          />
          <BaseSearchableSelect
            v-model="tempFilters.excludeProductIds"
            label="Exclude Products"
            multiple
            :options="productStore.products.map((p) => ({ label: p.name, value: p.id }))"
            placeholder="Select products to exclude"
          />

          <div class="flex justify-end gap-3 pt-2">
            <BaseButton variant="ghost" @click="resetFilters">Reset</BaseButton>
            <BaseButton @click="applyFilters">Apply Filters</BaseButton>
          </div>
        </div>

        <!-- Active Filter Chips (Manual implementation for arrays) -->
        <div class="flex flex-wrap gap-2">
          <span
            v-if="appliedFilters.type === 'out'"
            class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium"
          >
            Type: Cash Out
          </span>
          <span v-else class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
            Type: Cash In
          </span>

          <span
            v-for="id in appliedFilters.includeCategoryIds"
            :key="'inc-cat-' + id"
            class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1"
          >
            + Cat: {{ categoryStore.categories.find((c) => c.id === id)?.name }}
          </span>

          <span
            v-for="id in appliedFilters.includeProductIds"
            :key="'inc-prod-' + id"
            class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1"
          >
            + Prod: {{ productStore.products.find((p) => p.id === id)?.name }}
          </span>
        </div>
      </div>

      <!-- Charts & Tables -->
      <!-- Pass baseTransactions (filtered by type/cat/prod) and globalFilterObj (date) -->

      <LazyRender min-height="380px">
        <TransactionsMonthChart
          :transactions="baseTransactions"
          :filter-type="appliedFilters.type"
          :global-filter="globalFilterObj"
        />
      </LazyRender>

      <LazyRender min-height="380px">
        <TransactionsYearChart
          :transactions="baseTransactions"
          :filter-type="appliedFilters.type"
          :global-filter="globalFilterObj"
        />
      </LazyRender>

      <LazyRender min-height="380px">
        <TransactionsMonthBarChart :transactions="baseTransactions" :global-filter="globalFilterObj" />
      </LazyRender>

      <LazyRender min-height="300px">
        <ProductSummaryTable :transactions="baseTransactions" :global-filter="globalFilterObj" />
      </LazyRender>

      <LazyRender min-height="300px">
        <CategorySummaryTable :transactions="baseTransactions" :global-filter="globalFilterObj" />
      </LazyRender>
    </main>
  </PageLayout>
</template>
