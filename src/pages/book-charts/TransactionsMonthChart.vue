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
import { createChartOptions } from '@/utils/chartOptions'
import DateRangeTabs from "@/components/common/DateRangeTabs.vue"
import { filterByDateRange, formatMonthYear, getMonthKey } from "@/utils/dateUtils"

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
  const data = new Map()

  filteredTransactions.value.forEach((t) => {
    const date = new Date(t.date)
    const key = getMonthKey(date)
    const total = parseFloat(t.amount) || 0

    if (!data.has(key)) {
      data.set(key, { date, total: 0 })
    } else if (date < data.get(key).date) {
      // Keep the earliest date so the points sort in calendar order even when
      // the incoming list is not already ordered.
      data.get(key).date = date
    }

    data.get(key).total += total
  })

  // Group by the displayed calendar, so a BS month is one point rather than
  // two halves either side of an AD month boundary.
  const points = Array.from(data.values()).sort((a, b) => a.date - b.date)

  return {
    labels: points.map((point) => formatMonthYear(point.date)),
    datasets: [
      {
        label: props.filterType === "out" ? "Monthly Expenses" : "Monthly Income",
        backgroundColor: "#f87979",
        borderColor: "#f87979",
        data: points.map((point) => point.total),
        tension: 0.1,
      },
    ],
  }
})

const chartOptions = createChartOptions()
</script>

<template>
  <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
    <div class="mb-4">
      <h3 class="font-medium text-gray-900 mb-2 dark:text-gray-100">Monthly Trends</h3>
      <DateRangeTabs v-model="localFilter" v-model:start-date="localStartDate" v-model:end-date="localEndDate" />
    </div>
    <div class="h-64">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
