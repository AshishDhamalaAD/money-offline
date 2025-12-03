<script setup>
import { computed } from "vue"
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const props = defineProps({
  transactions: {
    type: Array,
    required: true,
  },
  filterType: {
    type: String,
    default: "out",
  },
})

const chartData = computed(() => {
  const data = {}
  props.transactions.forEach((t) => {
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
        label: props.filterType === "out" ? "Yearly Expenses" : "Yearly Income",
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
</script>

<template>
  <div class="bg-white p-4 rounded-lg shadow-sm h-80">
    <h3 class="font-medium text-gray-900 mb-4">Transactions Year Wise Chart</h3>
    <div class="h-64">
      <Line v-if="chartData.labels.length > 0" :data="chartData" :options="chartOptions" />
      <div v-else class="h-full flex items-center justify-center text-gray-500">No data available</div>
    </div>
  </div>
</template>
