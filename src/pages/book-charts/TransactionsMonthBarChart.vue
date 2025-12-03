<script setup>
import { computed } from "vue"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"
import { Bar } from "vue-chartjs"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  transactions: {
    type: Array,
    required: true,
  },
})

const chartData = computed(() => {
  const data = {} // { year: { Jan: 0, Feb: 0, ... } }
  const years = new Set()

  props.transactions.forEach((t) => {
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
  <div class="bg-white p-4 rounded-lg shadow-sm h-80">
    <h3 class="font-medium text-gray-900 mb-4">Transactions Month Wise Bar Chart (Yearly Comparison)</h3>
    <div class="h-64">
      <Bar v-if="chartData.datasets.length > 0" :data="chartData" :options="chartOptions" />
      <div v-else class="h-full flex items-center justify-center text-gray-500">No data available</div>
    </div>
  </div>
</template>
