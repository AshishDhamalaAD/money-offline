<script setup>
import { computed } from "vue"
import { useRouter } from "vue-router"

import { formatDate } from "@/utils/dateUtils"
import IconBook from "@/assets/icons/IconBook.vue"
import IconEllipsisVertical from "@/assets/icons/IconEllipsisVertical.vue"

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
    class="group relative overflow-hidden rounded-sm bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md active:scale-[0.98]"
  >
    <div class="flex items-start justify-between">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
      >
        <IconBook />
      </div>
      <button class="rounded-full p-1 text-gray-400 hover:text-gray-600">
        <IconEllipsisVertical class="h-5 w-5" />
      </button>
    </div>

    <div class="mt-4">
      <h3 class="text-lg font-semibold text-gray-900">{{ book.name }}</h3>
      <p class="text-sm text-gray-500">Created on {{ formattedDate }}</p>
    </div>
  </div>
</template>
