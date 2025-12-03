<script setup>
import { ref, onMounted, computed, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { useBookStore } from "@/store/bookStore"
import { useCategoryStore } from "@/store/categoryStore"
import IconChevronRight from "@/assets/icons/IconChevronRight.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseSearchInput from "@/components/common/BaseSearchInput.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import SettingsTabs from "../components/SettingsTabs.vue"

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const categoryStore = useCategoryStore()

const bookId = parseInt(route.params.bookId)
const book = ref(null)

onMounted(async () => {
  if (!bookId) return
  book.value = await bookStore.getBook(bookId)
  categoryStore.watchCategories(bookId)
})

const searchQuery = ref(route.query.search || "")

// Update URL when search changes
watch(searchQuery, (newQuery) => {
  const query = { ...route.query, search: newQuery || undefined }
  router.replace({ query })
})

const filteredItems = computed(() => {
  const items = categoryStore.categories
  if (!searchQuery.value) return items

  const query = searchQuery.value.toLowerCase()
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query))
  )
})

// Pagination
const paginationLimit = 10
const visibleLimit = ref(parseInt(route.query.limit) || paginationLimit)

const paginatedItems = computed(() => {
  return filteredItems.value.slice(0, visibleLimit.value)
})

const hasMoreItems = computed(() => {
  return visibleLimit.value < filteredItems.value.length
})

function loadMore() {
  visibleLimit.value += paginationLimit
}

// Reset pagination when filters change
watch(searchQuery, () => {
  visibleLimit.value = paginationLimit
})

// Update URL when pagination changes
watch(visibleLimit, (newLimit) => {
  if (newLimit !== paginationLimit) {
    const query = { ...route.query, limit: newLimit }
    router.replace({ query })
  } else {
    const query = { ...route.query }
    delete query.limit
    router.replace({ query })
  }
})

function navigateToAdd() {
  router.push({
    name: "book-settings-categories-new",
    params: { bookId },
    query: {
      search: searchQuery.value || undefined,
      limit: visibleLimit.value !== paginationLimit ? visibleLimit.value : undefined,
    },
  })
}

function navigateToEdit(item) {
  router.push({
    name: "book-settings-categories-edit",
    params: {
      bookId,
      id: item.id,
    },
    query: {
      search: searchQuery.value || undefined,
      limit: visibleLimit.value !== paginationLimit ? visibleLimit.value : undefined,
    },
  })
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="`${book?.name || 'Book'}`" :back-route="{ name: 'book-details', params: { id: bookId } }" />

    <main class="p-4 space-y-6">
      <SettingsTabs :book-id="bookId" />

      <div class="space-y-4">
        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold text-gray-800">
              Manage Categories
              <span class="text-sm font-normal" v-if="filteredItems.length > 0 && filteredItems.length > visibleLimit">
                ({{ paginatedItems.length }}/{{ filteredItems.length }})
              </span>
            </h2>
            <BaseButton size="sm" @click="navigateToAdd">Add New</BaseButton>
          </div>

          <div>
            <BaseSearchInput v-model="searchQuery" placeholder="Search categories..." />
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="item in paginatedItems"
            :key="item.id"
            @click="navigateToEdit(item)"
            class="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500">{{ item.description }}</p>
            </div>
            <IconChevronRight class="text-gray-400" />
          </div>
          <div v-if="filteredItems.length === 0" class="text-center text-gray-500 py-8">No categories found.</div>
          <div v-if="hasMoreItems" class="flex justify-center py-4">
            <BaseButton variant="secondary" @click="loadMore">Load More</BaseButton>
          </div>
        </div>
      </div>
    </main>
  </PageLayout>
</template>
