<script setup>
import { ref, onMounted, watch, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useBookStore } from "../stores/bookStore"
import { useMasterStore } from "../stores/masterStore"
import BaseButton from "../components/ui/BaseButton.vue"
import PageLayout from "../components/layout/PageLayout.vue"
import PageHeader from "../components/layout/PageHeader.vue"
import LegacyImport from "../components/settings/LegacyImport.vue"
import ProductRateImport from "../components/settings/ProductRateImport.vue"
import SearchInput from "../components/ui/SearchInput.vue"
import IconChevronRight from "../components/icons/IconChevronRight.vue"
import IconHistory from "../components/icons/IconHistory.vue"
import { resizedImageUrls } from "../utils/imageUtils"

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const masterStore = useMasterStore()

const bookId = parseInt(route.params.bookId)
const book = ref(null)
const activeTab = ref(route.query.tab || "categories")

onMounted(async () => {
  if (!bookId) return
  book.value = await bookStore.getBook(bookId)
  masterStore.watchBookData(bookId)
})

// Watch for tab changes to update URL
watch(activeTab, (newTab) => {
  const query = { ...route.query, tab: newTab }
  // Keep search if switching tabs? Usually better to reset, but user asked to persist when going to edit and back.
  // If switching tabs, maybe reset search? The existing code resets search when tab changes.
  // Let's keep that behavior for now.
  if (route.query.tab !== newTab) {
    delete query.search
  }
  router.replace({ query })
})

// Watch route query to update activeTab (for back/forward navigation)
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && ["categories", "products", "paymentModes", "import", "rateHistoryImport"].includes(newTab)) {
      activeTab.value = newTab
    }
  }
)

function goBack() {
  router.push({ name: "book-details", params: { id: bookId } })
}

function navigateToEdit(type, item) {
  router.push({
    name: "edit-item",
    params: {
      bookId,
      type,
      itemId: item.id,
    },
    query: { tab: activeTab.value, search: searchQuery.value || undefined, limit: visibleLimit.value !== paginationLimit ? visibleLimit.value : undefined }, // Pass tab, search, and limit to return to correct state
  })
}

function navigateToAdd(type) {
  router.push({
    name: "new-item",
    params: {
      bookId,
      type,
    },
    query: { tab: activeTab.value, search: searchQuery.value || undefined, limit: visibleLimit.value !== paginationLimit ? visibleLimit.value : undefined },
  })
}

function navigateToHistory(product) {
  router.push({
    name: "product-rates-history",
    params: {
      bookId,
      productId: product.id,
    },
  })
}

const tabs = [
  { id: "categories", label: "Categories" },
  { id: "products", label: "Products" },
  { id: "paymentModes", label: "Payment Modes" },
  { id: "import", label: "Import Legacy Data" },
  { id: "rateHistoryImport", label: "Import Rate History" },
]

const searchQuery = ref(route.query.search || "")

// Update URL when search changes
watch(searchQuery, (newQuery) => {
  const query = { ...route.query, search: newQuery || undefined }
  router.replace({ query })
})

const filteredItems = computed(() => {
  let items = []
  if (activeTab.value === "categories") items = masterStore.categories
  else if (activeTab.value === "products") items = masterStore.products
  else if (activeTab.value === "paymentModes") items = masterStore.paymentModes
  else return []

  if (!searchQuery.value) return items

  const query = searchQuery.value.toLowerCase()
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query))
  )
})

// Reset search when tab changes
watch(activeTab, () => {
  searchQuery.value = ""
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
watch([activeTab, searchQuery], () => {
  visibleLimit.value = paginationLimit
})

// Update URL when pagination changes
watch(visibleLimit, (newLimit) => {
  if (newLimit !== paginationLimit) {
    const query = { ...route.query, limit: newLimit }
    router.replace({ query })
  } else {
    // Remove limit from URL if it's the default
    const query = { ...route.query }
    delete query.limit
    router.replace({ query })
  }
})
</script>

<template>
  <PageLayout>
    <PageHeader
      :title="`${book?.name || 'Book'} Settings`"
      :back-route="{ name: 'book-details', params: { id: bookId } }"
    />

    <main class="p-4 space-y-6">
      <!-- Tabs -->
      <div class="flex overflow-x-auto pb-2 pt-1 px-1 gap-2 no-scrollbar -mx-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
            activeTab === tab.id
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Lists -->
      <div class="space-y-4">
        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold text-gray-800">
              Manage {{ tabs.find((t) => t.id === activeTab)?.label }}
              <span class="text-sm font-normal" v-if="filteredItems.length > 0 && filteredItems.length > visibleLimit">
                ({{ paginatedItems.length }}/{{ filteredItems.length }})
              </span>
            </h2>
            <BaseButton v-if="activeTab !== 'import'" size="sm" @click="navigateToAdd(activeTab)">Add New</BaseButton>
          </div>

          <!-- Search Input -->
          <div v-if="activeTab !== 'import' && activeTab !== 'rateHistoryImport'">
            <SearchInput v-model="searchQuery" placeholder="Search..." />
          </div>
        </div>

        <!-- Categories List -->
        <div v-if="activeTab === 'categories'" class="space-y-3">
          <div
            v-for="item in paginatedItems"
            :key="item.id"
            @click="navigateToEdit('categories', item)"
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

        <!-- Products List -->
        <div v-if="activeTab === 'products'" class="space-y-3">
          <div
            v-for="item in paginatedItems"
            :key="item.id"
            @click="navigateToEdit('products', item)"
            class="flex justify-between items-center gap-2 bg-white p-4 rounded-sm shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center gap-4">
              <div v-if="item.attachments && item.attachments.length > 0" class="shrink-0 relative">
                <span v-if="item.attachments.length > 1" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{{ item.attachments.length }}</span>
                <img :src="resizedImageUrls({imageUrls: item.attachments})[0]" alt="" class="w-8 h-8 object-cover rounded-full"></img>
              </div>
              <div>
                <p class="font-medium">{{ item.name }}</p>
                <p class="text-xs text-gray-500">Rate: {{ item.rate }}</p>
                <p class="text-xs text-gray-400">{{ item.description }}</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                @click.stop="navigateToHistory(item)"
                class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                title="View Rate History"
              >
                <IconHistory class="w-5 h-5" />
              </button>
              <IconChevronRight class="text-gray-400" />
            </div>
          </div>
          <div v-if="filteredItems.length === 0" class="text-center text-gray-500 py-8">No products found.</div>
          <div v-if="hasMoreItems" class="flex justify-center py-4">
            <BaseButton variant="secondary" @click="loadMore">Load More</BaseButton>
          </div>
        </div>

        <!-- Payment Modes List -->
        <div v-if="activeTab === 'paymentModes'" class="space-y-3">
          <div
            v-for="item in paginatedItems"
            :key="item.id"
            @click="navigateToEdit('paymentModes', item)"
            class="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500">{{ item.description }}</p>
            </div>
            <IconChevronRight class="text-gray-400" />
          </div>
          <div v-if="filteredItems.length === 0" class="text-center text-gray-500 py-8">No payment modes found.</div>
          <div v-if="hasMoreItems" class="flex justify-center py-4">
            <BaseButton variant="secondary" @click="loadMore">Load More</BaseButton>
          </div>
        </div>

        <!-- Legacy Import -->
        <div v-if="activeTab === 'import'">
          <LegacyImport :book-id="bookId" />
        </div>

        <!-- Rate History Import -->
        <div v-if="activeTab === 'rateHistoryImport'">
          <ProductRateImport />
        </div>
      </div>
    </main>
  </PageLayout>
</template>
