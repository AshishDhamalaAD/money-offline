<script setup>
import { computed } from "vue"
import { useRouter } from "vue-router"

import { formatDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/moneyUtils"
import { setLastBookId } from "@/utils/lastBook"
import IconBook from "@/assets/icons/IconBook.vue"
import IconChartBar from "@/assets/icons/IconChartBar.vue"
import Sparkline from "@/pages/dashboard/Sparkline.vue"

const props = defineProps({
  book: {
    type: Object,
    required: true,
  },
  summary: {
    type: Object,
    default: null,
  },
})

const router = useRouter()

const bookSummary = computed(() => ({
  balance: props.summary?.balance ?? 0,
  monthOut: props.summary?.monthOut ?? 0,
  sparkline: props.summary?.sparkline ?? Array(7).fill(0),
}))

function openBook() {
  setLastBookId(props.book.id)
  router.push({ name: "book-details", params: { id: props.book.id } })
}

function openCharts() {
  setLastBookId(props.book.id)
  router.push({ name: "book-charts", params: { bookId: props.book.id } })
}

const formattedDate = computed(() => {
  return formatDate(props.book.created_at)
})
</script>

<template>
  <div
    @click="openBook"
    class="group relative overflow-hidden rounded-sm bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md active:scale-[0.98] dark:bg-gray-900 dark:ring-gray-800 dark:hover:shadow-black/30"
  >
    <div class="flex items-start justify-between">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-100 dark:group-hover:bg-indigo-900/60"
      >
        <IconBook />
      </div>
      <div class="flex gap-1">
        <button
          @click.stop="openCharts"
          class="rounded-full p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
          title="View Charts"
        >
          <IconChartBar class="h-5 w-5" />
        </button>
      </div>
    </div>

    <div class="mt-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ book.name }}</h3>

      <p
        :class="[
          'mt-1 truncate text-2xl font-bold',
          bookSummary.balance >= 0
            ? 'text-gray-900 dark:text-gray-50'
            : 'text-red-600 dark:text-red-400',
        ]"
      >
        {{ formatCurrency(bookSummary.balance) }}
      </p>

      <div class="mt-3 flex items-end justify-between gap-3">
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Spent this month</p>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
            {{ formatCurrency(bookSummary.monthOut) }}
          </p>
        </div>
        <Sparkline
          :values="bookSummary.sparkline"
          class="shrink-0 text-indigo-500 dark:text-indigo-300"
        />
      </div>

      <p class="mt-3 text-xs text-gray-400 dark:text-gray-500">Created on {{ formattedDate }}</p>
    </div>
  </div>
</template>
