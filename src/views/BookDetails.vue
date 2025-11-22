<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookStore } from '../stores/bookStore'
import { useTransactionStore } from '../stores/transactionStore'
import { useMasterStore } from '../stores/masterStore'
import TransactionCard from '../components/TransactionCard.vue'
import StatsSummary from '../components/StatsSummary.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import Modal from '../components/ui/Modal.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import PageHeader from '../components/layout/PageHeader.vue'
import BaseButton from '../components/ui/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const transactionStore = useTransactionStore()
const masterStore = useMasterStore()

const book = ref(null)
const bookId = ref(null)
const selectedFilter = ref('month') // Default to month
const startDate = ref('')
const endDate = ref('')
const showDeleteModal = ref(false)
const transactionToDelete = ref(null)

// Edit Book
const showEditBookModal = ref(false)
const editBookName = ref('')

onMounted(async () => {
  const bookIdParam = parseInt(route.params.id)
  if (!bookIdParam) return
  
  bookId.value = bookIdParam
  book.value = await bookStore.getBook(bookId.value)
  transactionStore.setBookId(bookId.value)
})

const filterOptions = computed(() => {
  return [
    { label: 'This Month', value: 'month' },
    { label: 'Last Month', value: 'last-month' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'this-week' },
    { label: 'Last Week', value: 'last-week' },
    { label: 'This Year', value: 'this-year' },
    { label: 'Last Year', value: 'last-year' },
    { label: 'All', value: 'all' },
    { label: 'Custom Date Range', value: 'custom' }
  ]
})

const filteredTransactions = computed(() => {
  if (selectedFilter.value === 'all') {
    return transactionStore.transactions
  } else if (selectedFilter.value === 'custom') {
    if (startDate.value && endDate.value) {
      return transactionStore.getFilteredTransactions({ 
        dateRange: 'custom', 
        startDate: startDate.value, 
        endDate: endDate.value 
      })
    } else {
      return transactionStore.transactions
    }
  } else {
    return transactionStore.getFilteredTransactions({ dateRange: selectedFilter.value })
  }
})

const groupedTransactions = computed(() => {
  const groups = {}
  
  filteredTransactions.value.forEach(transaction => {
    const date = new Date(transaction.date)
    const dateKey = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        timestamp: date.getTime(),
        transactions: []
      }
    }
    
    groups[dateKey].transactions.push(transaction)
  })
  
  // Convert to array and sort by timestamp (most recent first)
  return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp)
})

const filteredStats = computed(() => {
  let totalIn = 0
  let totalOut = 0
  let openingBalance = 0

  // Calculate opening balance (net balance from transactions before the filter period)
  if (selectedFilter.value !== 'all') {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    let filterStartDate = null
    
    if (selectedFilter.value === 'today') {
      filterStartDate = new Date(now)
    } else if (selectedFilter.value === 'yesterday') {
      filterStartDate = new Date(now)
      filterStartDate.setDate(filterStartDate.getDate() - 1)
    } else if (selectedFilter.value === 'week') {
      filterStartDate = new Date(now)
      filterStartDate.setDate(filterStartDate.getDate() - 6)
    } else if (selectedFilter.value === 'this-week') {
      const dayOfWeek = now.getDay()
      filterStartDate = new Date(now)
      filterStartDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    } else if (selectedFilter.value === 'last-week') {
      const dayOfWeek = now.getDay()
      filterStartDate = new Date(now)
      filterStartDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7)
    } else if (selectedFilter.value === 'month') {
      filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (selectedFilter.value === 'last-month') {
      filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    } else if (selectedFilter.value === 'this-year') {
      filterStartDate = new Date(now.getFullYear(), 0, 1)
    } else if (selectedFilter.value === 'last-year') {
      filterStartDate = new Date(now.getFullYear() - 1, 0, 1)
    } else if (selectedFilter.value === 'custom' && startDate.value) {
      filterStartDate = new Date(startDate.value)
      filterStartDate.setHours(0, 0, 0, 0)
    }
    
    // Calculate balance from all transactions before the filter start date
    if (filterStartDate) {
      transactionStore.transactions.forEach(t => {
        const tDate = new Date(t.date)
        tDate.setHours(0, 0, 0, 0)
        
        if (tDate < filterStartDate) {
          const amount = parseFloat(t.amount) || 0
          if (t.type === 'in') openingBalance += amount
          else if (t.type === 'out') openingBalance -= amount
        }
      })
    }
  }

  // Calculate current period stats
  filteredTransactions.value.forEach(t => {
    const amount = parseFloat(t.amount) || 0
    if (t.type === 'in') totalIn += amount
    else if (t.type === 'out') totalOut += amount
  })

  const netBalance = totalIn - totalOut
  const closingBalance = openingBalance + netBalance

  return {
    totalIn,
    totalOut,
    netBalance,
    openingBalance,
    closingBalance
  }
})

function goToCreateTransaction() {
  router.push({ name: 'create-transaction', params: { bookId: bookId.value } })
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
  await bookStore.updateBook(bookId.value, { name: editBookName.value })
  book.value.name = editBookName.value
  showEditBookModal.value = false
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="book?.name || 'Book Details'">
      <template #actions>
        <button @click="router.push({ name: 'book-settings', params: { bookId } })" class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button @click="openEditBook" class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </template>
    </PageHeader>

    <!-- Content -->
    <main class="p-4 space-y-4">
      <!-- Stats -->
      <StatsSummary :stats="filteredStats" />

      <!-- Filters -->
      <div class="space-y-3">
        <div class="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
          <button 
            v-for="opt in filterOptions.slice(0, -1)" 
            :key="opt.value"
            @click="selectedFilter = opt.value"
            :class="[
              'rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
              selectedFilter === opt.value ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm'
            ]"
          >
            {{ opt.label }}
          </button>
          <button 
            @click="selectedFilter = 'custom'"
            :class="[
              'rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
              selectedFilter === 'custom' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm'
            ]"
          >
            Custom
          </button>
        </div>
        
        <!-- Custom Date Range Pickers -->
        <div v-if="selectedFilter === 'custom'" class="grid grid-cols-2 gap-3">
          <BaseInput 
            v-model="customStartDate" 
            type="date" 
            label="Start Date"
          />
          <BaseInput 
            v-model="customEndDate" 
            type="date" 
            label="End Date"
          />
        </div>
      </div>

      <!-- Transactions -->
      <div class="space-y-6">
        <div v-if="groupedTransactions.length === 0" class="py-10 text-center text-gray-500">
          No transactions found for this period.
        </div>
        
        <div v-for="group in groupedTransactions" :key="group.date" class="space-y-3">
          <!-- Date Header -->
          <div class="bg-gray-100 px-4 py-2 rounded-lg">
            <h3 class="text-sm font-bold text-gray-900">{{ group.date }}</h3>
          </div>
          
          <!-- Transactions for this date -->
          <div 
            v-for="t in group.transactions" 
            :key="t.id"
            @click="router.push({ name: 'edit-transaction', params: { bookId: book.id, id: t.id } })"
            @contextmenu.prevent="confirmDelete(t)"
            class="cursor-pointer transition-opacity active:opacity-70"
          >
            <TransactionCard :transaction="t" />
          </div>
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
  </PageLayout>
</template>
