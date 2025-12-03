<script setup>
import { ref, computed, watch } from "vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import IconChevronLeft from "@/assets/icons/IconChevronLeft.vue"
import IconChevronRight from "@/assets/icons/IconChevronRight.vue"
import IconSearch from "@/assets/icons/IconSearch.vue"

const props = defineProps({
  columns: {
    type: Array,
    required: true,
    // { key, label, sortable, format, align }
  },
  data: {
    type: Array,
    required: true,
  },
  defaultSort: {
    type: Object,
    default: () => ({ key: "", direction: "asc" }),
  },
  pageSize: {
    type: Number,
    default: 10,
  },
})

// State
const searchQuery = ref("")
const currentPage = ref(1)
const sortKey = ref(props.defaultSort.key)
const sortDirection = ref(props.defaultSort.direction)

// Reset page on search
watch(searchQuery, () => {
  currentPage.value = 1
})

// Sorting Logic
function toggleSort(key) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
  } else {
    sortKey.value = key
    sortDirection.value = "desc" // Default to desc for new columns (often better for numbers)
  }
}

// Filtered & Sorted Data
const processedData = computed(() => {
  let result = [...props.data]

  // 1. Search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((row) => {
      return props.columns.some((col) => {
        const val = row[col.key]
        return String(val).toLowerCase().includes(query)
      })
    })
  }

  // 2. Sort
  if (sortKey.value) {
    result.sort((a, b) => {
      const valA = a[sortKey.value]
      const valB = b[sortKey.value]

      if (valA === valB) return 0

      const modifier = sortDirection.value === "asc" ? 1 : -1

      // Check if numbers
      if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
        return (valA - valB) * modifier
      }

      return String(valA).localeCompare(String(valB)) * modifier
    })
  }

  return result
})

// Pagination Logic
const totalPages = computed(() => Math.ceil(processedData.value.length / props.pageSize))

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  return processedData.value.slice(start, start + props.pageSize)
})

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
    <!-- Header / Controls -->
    <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
      <h3 class="font-medium text-gray-900"><slot name="title">Table</slot></h3>
      <div class="w-full sm:w-64">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
            class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <IconSearch class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>

    <div v-if="$slots.filters" class="px-4 py-2">
      <slot name="filters"></slot>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              @click="col.sortable ? toggleSort(col.key) : null"
              :class="[
                'px-4 py-3 select-none',
                col.align === 'right' ? 'text-right' : 'text-left',
                col.sortable ? 'cursor-pointer hover:bg-gray-100' : '',
              ]"
            >
              <div class="flex items-center gap-1" :class="{ 'justify-end': col.align === 'right' }">
                {{ col.label }}
                <span v-if="sortKey === col.key" class="text-xs text-indigo-500">
                  {{ sortDirection === "asc" ? "↑" : "↓" }}
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="(row, index) in paginatedData" :key="index" class="hover:bg-gray-50">
            <td
              v-for="col in columns"
              :key="col.key"
              :class="['px-4 py-3 text-gray-900', col.align === 'right' ? 'text-right' : 'text-left']"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ col.format ? col.format(row[col.key]) : row[col.key] }}
              </slot>
            </td>
          </tr>
          <tr v-if="paginatedData.length === 0">
            <td :colspan="columns.length" class="px-4 py-8 text-center text-gray-500">No data found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="p-4 border-t border-gray-100 flex items-center justify-between">
      <span class="text-xs text-gray-500"> Page {{ currentPage }} of {{ totalPages }} </span>
      <div class="flex gap-2">
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconChevronLeft class="w-5 h-5 text-gray-600" />
        </button>
        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconChevronRight class="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  </div>
</template>
