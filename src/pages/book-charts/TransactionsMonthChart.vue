<script setup>
import { computed, ref, watch } from "vue"
import { Line } from "vue-chartjs"
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
} from "chart.js"
import DateRangeTabs from "@/components/common/DateRangeTabs.vue"
import { filterByDateRange } from "@/utils/dateUtils"

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale)

const props = defineProps({
  transactions: {
    type: Array,
    required: true,
  },
  filterType: {
    type: String,
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

// Watch for global filter changes to update local filter
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
        label: props.filterType === "out" ? "Monthly Expenses" : "Monthly Income",
        backgroundColor: "#f87979",
        borderColor: "#f87979",
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
  <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
    <div class="mb-4">
      <h3 class="font-medium text-gray-900 mb-2">Monthly Trends</h3>
      <DateRangeTabs v-model="localFilter" v-model:start-date="localStartDate" v-model:end-date="localEndDate" />
    </div>
    <div class="h-64">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
