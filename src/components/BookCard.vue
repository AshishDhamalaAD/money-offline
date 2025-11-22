<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { formatDate } from '../utils/dateUtils'

const props = defineProps({
    book: {
        type: Object,
        required: true
    }
})

const router = useRouter()

function openBook() {
    router.push({ name: 'book-details', params: { id: props.book.id } })
}

const formattedDate = computed(() => {
    return formatDate(props.book.created_at)
})
</script>

<template>
    <div @click="openBook"
         class="group relative overflow-hidden rounded-sm bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md active:scale-[0.98]">
        <div class="flex items-start justify-between">
            <div
                 class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                <svg class="h-6 w-6"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor">
                    <path stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            </div>
            <button class="rounded-full p-1 text-gray-400 hover:text-gray-600">
                <svg class="h-5 w-5"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor">
                    <path stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </button>
        </div>

        <div class="mt-4">
            <h3 class="text-lg font-semibold text-gray-900">{{ book.name }}</h3>
            <p class="text-sm text-gray-500">Created on {{ formattedDate }}</p>
        </div>
    </div>
</template>
