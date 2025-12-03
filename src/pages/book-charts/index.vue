<script setup>
import { ref, onMounted, computed, reactive } from "vue"
import { useRoute } from "vue-router"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Line, Bar } from "vue-chartjs"

import { useTransactionStore } from "@/store/transactionStore"
import { useBookStore } from "@/store/bookStore"
import { useCategoryStore } from "@/store/categoryStore"
import { useProductStore } from "@/store/productStore"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseSearchableSelect from "@/components/common/BaseSearchableSelect.vue"
import IconFilter from "@/assets/icons/IconFilter.vue"
import IconX from "@/assets/icons/IconX.vue"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

const route = useRoute()
const transactionStore = useTransactionStore()
const bookStore = useBookStore()
const categoryStore = useCategoryStore()
const productStore = useProductStore()

const bookId = parseInt(route.params.bookId)
const book = ref(null)

// Filter State
const showFilters = ref(false)
const filters = reactive({
  type: "out", // 'in' or 'out'
  startDate: "",
  endDate: "",
  includeCategoryIds: [],
  excludeCategoryIds: [],
  includeProductIds: [],
  excludeProductIds: [],
})

// Applied Filters (Snapshot for charts)
const appliedFilters = ref({ ...filters })

onMounted(async () => {
  book.value = await bookStore.getBook(bookId)
  transactionStore.setBookId(bookId)
  categoryStore.watchCategories(bookId)
  productStore.watchProducts(bookId)
})

function applyFilters() {
  appliedFilters.value = JSON.parse(JSON.stringify(filters))
  // showFilters.value = false // Optional: keep open or close
}

function resetFilters() {
  filters.type = "out"
  filters.startDate = ""
  filters.endDate = ""
  filters.includeCategoryIds = []
  filters.excludeCategoryIds = []
  filters.includeProductIds = []
  filters.excludeProductIds = []
  applyFilters()
}

// Helper to add/remove from arrays
function addItem(array, id) {
  if (id && !array.includes(id)) array.push(id)
}
function removeItem(array, index) {
  array.splice(index, 1)
}

const filteredTransactions = computed(() => {
  let transactions = transactionStore.transactions.filter((t) => t.type === appliedFilters.value.type)

  // Date Range
  if (appliedFilters.value.startDate) {
    transactions = transactions.filter((t) => new Date(t.date) >= new Date(appliedFilters.value.startDate))
  }
  if (appliedFilters.value.endDate) {
    const end = new Date(appliedFilters.value.endDate)
    end.setHours(23, 59, 59, 999)
    transactions = transactions.filter((t) => new Date(t.date) <= end)
  }

  // Include Categories
  if (appliedFilters.value.includeCategoryIds.length > 0) {
    transactions = transactions.filter((t) => {
      // Transaction has category_ids array
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

      return [...t.category_ids, ...transactionProductCategoryIds].some((id) =>
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

// --- Chart Data Generators ---

// Monthly Expenses (Line)
const monthlyChartData = computed(() => {
  const data = {}
  filteredTransactions.value.forEach((t) => {
    const date = new Date(t.date)
    const key = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`
    if (!data[key]) data[key] = 0
    data[key] += parseFloat(t.amount)
  })

  const sortedKeys = Object.keys(data).sort((a, b) => new Date(a) - new Date(b))

  return {
    labels: sortedKeys,
    datasets: [
      {
        label: appliedFilters.value.type === "out" ? "Monthly Expenses" : "Monthly Income",
        backgroundColor: "#f87979",
        borderColor: "#f87979",
        data: sortedKeys.map((key) => data[key]),
        tension: 0.1,
      },
    ],
  }
})

// Yearly Expenses (Line)
const yearlyChartData = computed(() => {
  const data = {}
  filteredTransactions.value.forEach((t) => {
    const date = new Date(t.date)
    const key = `${date.getFullYear()}`
    if (!data[key]) data[key] = 0
    data[key] += parseFloat(t.amount)
  })

  const sortedKeys = Object.keys(data).sort()

  return {
    labels: sortedKeys,
    datasets: [
      {
        label: appliedFilters.value.type === "out" ? "Yearly Expenses" : "Yearly Income",
        backgroundColor: "#36A2EB",
        borderColor: "#36A2EB",
        data: sortedKeys.map((key) => data[key]),
        tension: 0.1,
      },
    ],
  }
})

// Yearly Comparison (Grouped Bar)
const yearlyComparisonChartData = computed(() => {
  const data = {} // { year: { Jan: 0, Feb: 0, ... } }
  const years = new Set()

  filteredTransactions.value.forEach((t) => {
    const date = new Date(t.date)
    const year = date.getFullYear()
    const month = date.toLocaleString("default", { month: "short" })

    years.add(year)
    if (!data[year]) data[year] = {}
    if (!data[year][month]) data[year][month] = 0
    data[year][month] += parseFloat(t.amount)
  })

  const sortedYears = Array.from(years).sort()
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  // Distinct colors for years
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]

  const datasets = sortedYears.map((year, index) => ({
    label: `Year ${year}`,
    backgroundColor: colors[index % colors.length],
    data: months.map((m) => data[year]?.[m] || 0),
  }))

  return {
    labels: months,
    datasets,
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="`${book?.name || 'Book'} Charts`">
      <template #actions>
        <button
          @click="showFilters = !showFilters"
          :class="[
            'p-2 rounded-full transition-colors',
            showFilters ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100',
          ]"
        >
          <IconFilter class="w-6 h-6" />
        </button>
      </template>
    </PageHeader>

    <main class="p-4 space-y-6 pb-24">
      <!-- Filters Section -->
      <div v-if="showFilters" class="bg-white p-4 rounded-lg shadow-sm space-y-6 border border-indigo-100">
        <!-- Type Toggle -->
        <div class="flex rounded-sm bg-gray-100 p-1 w-full md:w-64">
          <button
            @click="filters.type = 'in'"
            :class="[
              'flex-1 rounded-sm py-1.5 text-sm font-medium transition-all',
              filters.type === 'in' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600',
            ]"
          >
            Cash In (+)
          </button>
          <button
            @click="filters.type = 'out'"
            :class="[
              'flex-1 rounded-sm py-1.5 text-sm font-medium transition-all',
              filters.type === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600',
            ]"
          >
            Cash Out (-)
          </button>
        </div>

        <!-- Date Range -->
        <div class="grid grid-cols-2 gap-3">
          <BaseInput v-model="filters.startDate" type="date" label="Start Date" />
          <BaseInput v-model="filters.endDate" type="date" label="End Date" />
        </div>

        <!-- Categories Filter -->
        <div class="grid md:grid-cols-2 gap-4">
          <!-- Include Categories -->
          <div class="space-y-2">
            <BaseSearchableSelect
              :model-value="''"
              @update:model-value="(id) => addItem(filters.includeCategoryIds, id)"
              label="Include Categories"
              :options="categoryStore.categories.map((c) => ({ label: c.name, value: c.id }))"
              placeholder="Select categories to include"
            />
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(id, index) in filters.includeCategoryIds"
                :key="id"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {{ categoryStore.categories.find((c) => c.id === id)?.name || "Unknown" }}
                <button @click="removeItem(filters.includeCategoryIds, index)" class="ml-1 hover:text-green-900">
                  <IconX class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>

          <!-- Exclude Categories -->
          <div class="space-y-2">
            <BaseSearchableSelect
              :model-value="''"
              @update:model-value="(id) => addItem(filters.excludeCategoryIds, id)"
              label="Exclude Categories"
              :options="categoryStore.categories.map((c) => ({ label: c.name, value: c.id }))"
              placeholder="Select categories to exclude"
            />
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(id, index) in filters.excludeCategoryIds"
                :key="id"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
              >
                {{ categoryStore.categories.find((c) => c.id === id)?.name || "Unknown" }}
                <button @click="removeItem(filters.excludeCategoryIds, index)" class="ml-1 hover:text-red-900">
                  <IconX class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Products Filter -->
        <div class="grid md:grid-cols-2 gap-4">
          <!-- Include Products -->
          <div class="space-y-2">
            <BaseSearchableSelect
              :model-value="''"
              @update:model-value="(id) => addItem(filters.includeProductIds, id)"
              label="Include Products"
              :options="productStore.products.map((p) => ({ label: p.name, value: p.id }))"
              placeholder="Select products to include"
            />
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(id, index) in filters.includeProductIds"
                :key="id"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {{ productStore.products.find((p) => p.id === id)?.name || "Unknown" }}
                <button @click="removeItem(filters.includeProductIds, index)" class="ml-1 hover:text-green-900">
                  <IconX class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>

          <!-- Exclude Products -->
          <div class="space-y-2">
            <BaseSearchableSelect
              :model-value="''"
              @update:model-value="(id) => addItem(filters.excludeProductIds, id)"
              label="Exclude Products"
              :options="productStore.products.map((p) => ({ label: p.name, value: p.id }))"
              placeholder="Select products to exclude"
            />
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(id, index) in filters.excludeProductIds"
                :key="id"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
              >
                {{ productStore.products.find((p) => p.id === id)?.name || "Unknown" }}
                <button @click="removeItem(filters.excludeProductIds, index)" class="ml-1 hover:text-red-900">
                  <IconX class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <BaseButton variant="ghost" @click="resetFilters">Reset</BaseButton>
          <BaseButton @click="applyFilters">Apply Filters</BaseButton>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="grid gap-6">
        <!-- Monthly Chart -->
        <div class="bg-white p-4 rounded-lg shadow-sm h-80">
          <h3 class="font-medium text-gray-900 mb-4">Transactions Month Wise Chart</h3>
          <div class="h-64">
            <Line v-if="monthlyChartData.labels.length > 0" :data="monthlyChartData" :options="chartOptions" />
            <div v-else class="h-full flex items-center justify-center text-gray-500">No data available</div>
          </div>
        </div>

        <!-- Yearly Chart -->
        <div class="bg-white p-4 rounded-lg shadow-sm h-80">
          <h3 class="font-medium text-gray-900 mb-4">Transactions Year Wise Chart</h3>
          <div class="h-64">
            <Line v-if="yearlyChartData.labels.length > 0" :data="yearlyChartData" :options="chartOptions" />
            <div v-else class="h-full flex items-center justify-center text-gray-500">No data available</div>
          </div>
        </div>

        <!-- Yearly Comparison Chart (Grouped Bar) -->
        <div class="bg-white p-4 rounded-lg shadow-sm h-80">
          <h3 class="font-medium text-gray-900 mb-4">Transactions Month Wise Bar Chart (Yearly Comparison)</h3>
          <div class="h-64">
            <Bar
              v-if="yearlyComparisonChartData.datasets.length > 0"
              :data="yearlyComparisonChartData"
              :options="chartOptions"
            />
            <div v-else class="h-full flex items-center justify-center text-gray-500">No data available</div>
          </div>
        </div>
      </div>
    </main>
  </PageLayout>
</template>
