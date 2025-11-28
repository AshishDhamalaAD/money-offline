<script setup>
import { ref, onMounted, computed, watch } from "vue"
import { useRoute } from "vue-router"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Line } from "vue-chartjs"

import { useTransactionStore } from "@/store/modules/transactionStore"
import { useBookStore } from "@/store/modules/bookStore"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseButton from "@/components/common/BaseButton.vue"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const route = useRoute()
const transactionStore = useTransactionStore()
const bookStore = useBookStore()

const bookId = parseInt(route.params.bookId)
const book = ref(null)

const startDate = ref("")
const endDate = ref("")

onMounted(async () => {
  book.value = await bookStore.getBook(bookId)
  transactionStore.setBookId(bookId)
})

const filteredTransactions = computed(() => {
  let transactions = transactionStore.transactions.filter((t) => t.type === "out")

  if (startDate.value) {
    transactions = transactions.filter((t) => new Date(t.date) >= new Date(startDate.value))
  }
  if (endDate.value) {
    const end = new Date(endDate.value)
    end.setHours(23, 59, 59, 999)
    transactions = transactions.filter((t) => new Date(t.date) <= end)
  }

  return transactions.sort((a, b) => new Date(a.date) - new Date(b.date))
})

// Monthly Chart Data
const monthlyChartData = computed(() => {
  const data = {}
  filteredTransactions.value.forEach((t) => {
    const date = new Date(t.date)
    const key = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`
    if (!data[key]) data[key] = 0
    data[key] += parseFloat(t.amount)
  })

  // Sort keys chronologically
  const sortedKeys = Object.keys(data).sort((a, b) => {
    const dateA = new Date(a)
    const dateB = new Date(b)
    return dateA - dateB
  })

  return {
    labels: sortedKeys,
    datasets: [
      {
        label: "Monthly Expenses",
        backgroundColor: "#f87979",
        borderColor: "#f87979",
        data: sortedKeys.map((key) => data[key]),
        tension: 0.1,
      },
    ],
  }
})

// Yearly Chart Data
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
        label: "Yearly Expenses",
        backgroundColor: "#36A2EB",
        borderColor: "#36A2EB",
        data: sortedKeys.map((key) => data[key]),
        tension: 0.1,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
}

function resetFilters() {
  startDate.value = ""
  endDate.value = ""
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="`${book?.name || 'Book'} Charts`" />

    <main class="p-4 space-y-6 pb-24">
      <!-- Filters -->
      <div class="bg-white p-4 rounded-lg shadow-sm space-y-4">
        <h3 class="font-medium text-gray-900">Date Range</h3>
        <div class="grid grid-cols-2 gap-3">
          <BaseInput v-model="startDate" type="date" label="Start Date" />
          <BaseInput v-model="endDate" type="date" label="End Date" />
        </div>
        <div class="flex justify-end">
          <BaseButton variant="ghost" size="sm" @click="resetFilters">Reset</BaseButton>
        </div>
      </div>

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
    </main>
  </PageLayout>
</template>
