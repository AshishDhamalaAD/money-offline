<script setup>
import { computed, ref, watch } from "vue"
import { Bar } from "vue-chartjs"
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js"
import DateRangeTabs from "@/components/common/DateRangeTabs.vue"
import { filterByDateRange } from "@/utils/dateUtils"

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

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

const localFilter = ref("all")
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

const chartData = computed(() => {
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
  <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
    <div class="mb-4">
      <h3 class="font-medium text-gray-900 mb-2">Yearly Comparison</h3>
      <DateRangeTabs v-model="localFilter" v-model:start-date="localStartDate" v-model:end-date="localEndDate" />
    </div>
    <div class="h-64">
      <Bar v-if="chartData.datasets.length > 0" :data="chartData" :options="chartOptions" />
      <div v-else class="h-full flex items-center justify-center text-gray-500">No data available</div>
    </div>
  </div>
</template>
