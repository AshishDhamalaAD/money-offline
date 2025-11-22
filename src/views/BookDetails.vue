<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookStore } from '../stores/bookStore'
import { useTransactionStore } from '../stores/transactionStore'
import StatsSummary from '../components/StatsSummary.vue'
import TransactionCard from '../components/TransactionCard.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import BaseInput from '../components/ui/BaseInput.vue'

import Modal from '../components/ui/Modal.vue'
import BaseButton from '../components/ui/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const transactionStore = useTransactionStore()

const book = ref(null)
const filter = ref('month') // Default to month
const showDeleteModal = ref(false)
const transactionToDelete = ref(null)

// Edit Book
const showEditBookModal = ref(false)
const editBookName = ref('')

onMounted(async () => {
  const bookId = parseInt(route.params.id)
  if (!bookId) return
  
  book.value = await bookStore.getBook(bookId)
  transactionStore.setBookId(bookId)
})

const filteredTransactions = ref([])

watch([() => transactionStore.transactions, filter], () => {
  // Simple filter logic for now
  if (filter.value === 'all') {
    filteredTransactions.value = transactionStore.transactions
  } else {
    filteredTransactions.value = transactionStore.getFilteredTransactions({ dateRange: filter.value })
  }
}, { immediate: true })

function goBack() {
  router.push({ name: 'dashboard' })
}

function goToCreateTransaction() {
  router.push({ name: 'create-transaction', params: { bookId: book.value.id } })
}

function confirmDelete(transaction) {
  transactionToDelete.value = transaction
  showDeleteModal.value = true
}

async function handleDelete() {
  if (transactionToDelete.value) {
    await transactionStore.deleteTransaction(transactionToDelete.value.id)
    showDeleteModal.value = false
    transactionToDelete.value = null
  }
}

function openEditBook() {
  editBookName.value = book.value.name
  showEditBookModal.value = true
}

async function saveBookName() {
  if (!editBookName.value.trim()) return
  await bookStore.updateBook(book.value.id, { name: editBookName.value })
  book.value.name = editBookName.value
  showEditBookModal.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <header class="bg-white px-4 py-4 shadow-sm sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button @click="goBack" class="rounded-full p-1 text-gray-600 hover:bg-gray-100">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 class="text-xl font-bold text-gray-900 truncate max-w-[200px]">{{ book?.name || 'Loading...' }}</h1>
        </div>
        <button @click="openEditBook" class="text-gray-500 hover:text-indigo-600 p-2">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Content -->
    <main class="p-4 space-y-6">
      <!-- Stats -->
      <StatsSummary :stats="transactionStore.stats" />

      <!-- Filters -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
        <button 
          v-for="opt in ['all', 'today', 'yesterday', 'week', 'month']" 
          :key="opt"
          @click="filter = opt"
          :class="[
            'rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
            filter === opt ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm'
          ]"
        >
          {{ opt.charAt(0).toUpperCase() + opt.slice(1) }}
        </button>
      </div>

      <!-- Transactions -->
      <div class="space-y-3">
        <div v-if="filteredTransactions.length === 0" class="py-10 text-center text-gray-500">
          No transactions found for this period.
        </div>
        <div 
          v-for="t in filteredTransactions" 
          :key="t.id"
          @click="router.push({ name: 'edit-transaction', params: { bookId: book.id, id: t.id } })"
          @contextmenu.prevent="confirmDelete(t)"
          class="cursor-pointer transition-opacity active:opacity-70"
        >
          <TransactionCard :transaction="t" />
        </div>
      </div>
    </main>

    <!-- FAB -->
    <div class="fixed bottom-6 right-6">
      <button 
        @click="goToCreateTransaction"
        class="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105 active:scale-95"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <Modal :show="showDeleteModal" title="Delete Transaction" @close="showDeleteModal = false">
      <p class="text-gray-600">Are you sure you want to delete this transaction?</p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="handleDelete">Delete</BaseButton>
      </div>
    </Modal>

    <!-- Edit Book Modal -->
    <Modal :show="showEditBookModal" title="Edit Book Name" @close="showEditBookModal = false">
      <div class="space-y-4">
        <BaseInput v-model="editBookName" label="Book Name" autoFocus />
        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showEditBookModal = false">Cancel</BaseButton>
          <BaseButton @click="saveBookName">Save</BaseButton>
        </div>
      </div>
    </Modal>
  </div>
</template>
