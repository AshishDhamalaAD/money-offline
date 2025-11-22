<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookStore } from '../stores/bookStore'
import { useMasterStore } from '../stores/masterStore'
import BaseButton from '../components/ui/BaseButton.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import PageHeader from '../components/layout/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const masterStore = useMasterStore()

const bookId = parseInt(route.params.bookId)
const book = ref(null)
const activeTab = ref(route.query.tab || 'categories')

onMounted(async () => {
  if (!bookId) return
  book.value = await bookStore.getBook(bookId)
  masterStore.watchBookData(bookId)
})

// Watch for tab changes to update URL
watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } })
})

// Watch route query to update activeTab (for back/forward navigation)
watch(() => route.query.tab, (newTab) => {
  if (newTab && ['categories', 'products', 'paymentModes'].includes(newTab)) {
    activeTab.value = newTab
  }
})

function goBack() {
  router.push({ name: 'book-details', params: { id: bookId } })
}

function navigateToEdit(type, item) {
  router.push({ 
    name: 'edit-item', 
    params: { 
      bookId, 
      type, 
      itemId: item.id 
    },
    query: { tab: activeTab.value } // Pass tab to return to correct tab
  })
}

function navigateToAdd(type) {
  router.push({ 
    name: 'new-item', 
    params: { 
      bookId, 
      type 
    },
    query: { tab: activeTab.value }
  })
}

const tabs = [
  { id: 'categories', label: 'Categories' },
  { id: 'products', label: 'Products' },
  { id: 'paymentModes', label: 'Payment Modes' }
]
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
            activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Lists -->
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-800">
            Manage {{ tabs.find(t => t.id === activeTab)?.label }}
          </h2>
          <BaseButton size="sm" @click="navigateToAdd(activeTab)">Add New</BaseButton>
        </div>

        <!-- Categories List -->
        <div v-if="activeTab === 'categories'" class="space-y-3">
          <div 
            v-for="item in masterStore.categories" 
            :key="item.id" 
            @click="navigateToEdit('categories', item)"
            class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500">{{ item.description }}</p>
            </div>
            <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div v-if="masterStore.categories.length === 0" class="text-center text-gray-500 py-8">
            No categories found.
          </div>
        </div>

        <!-- Products List -->
        <div v-if="activeTab === 'products'" class="space-y-3">
          <div 
            v-for="item in masterStore.products" 
            :key="item.id" 
            @click="navigateToEdit('products', item)"
            class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500">Rate: {{ item.rate }}</p>
              <p class="text-xs text-gray-400">{{ item.description }}</p>
            </div>
            <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div v-if="masterStore.products.length === 0" class="text-center text-gray-500 py-8">
            No products found.
          </div>
        </div>

        <!-- Payment Modes List -->
        <div v-if="activeTab === 'paymentModes'" class="space-y-3">
          <div 
            v-for="item in masterStore.paymentModes" 
            :key="item.id" 
            @click="navigateToEdit('paymentModes', item)"
            class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500">{{ item.description }}</p>
            </div>
            <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div v-if="masterStore.paymentModes.length === 0" class="text-center text-gray-500 py-8">
            No payment modes found.
          </div>
        </div>

      </div>
    </main>
  </PageLayout>
</template>
