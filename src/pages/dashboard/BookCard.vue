<script setup>
import { computed } from "vue"
import { useRouter } from "vue-router"

import { formatDate } from "@/utils/dateUtils"
import IconBook from "@/assets/icons/IconBook.vue"
import IconChartBar from "@/assets/icons/IconChartBar.vue"

const props = defineProps({
  book: {
    type: Object,
    required: true,
  },
})

const router = useRouter()

function openBook() {
  router.push({ name: "book-details", params: { id: props.book.id } })
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
          @click.stop="router.push({ name: 'book-charts', params: { bookId: book.id } })"
          class="rounded-full p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
          title="View Charts"
        >
          <IconChartBar class="h-5 w-5" />
        </button>
      </div>
    </div>

    <div class="mt-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ book.name }}</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">Created on {{ formattedDate }}</p>
    </div>
  </div>
</template>
