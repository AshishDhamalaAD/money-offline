<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
import { formatDate, getNepalDate } from '../utils/dateUtils'

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

const showStats = ref(false)
const searchQuery = ref('')
const showFilterModal = ref(false)

// Actual filters applied
const filterCategory = ref('')
const filterPaymentMode = ref('')
const filterContact = ref('')
const filterProduct = ref('')

// Temporary filters for modal
const tempFilterCategory = ref('')
const tempFilterPaymentMode = ref('')
const tempFilterContact = ref('')
const tempFilterProduct = ref('')

onMounted(async () => {
    const bookIdParam = parseInt(route.params.id)
    if (!bookIdParam) return

    bookId.value = bookIdParam
    book.value = await bookStore.getBook(bookId.value)
    transactionStore.setBookId(bookId.value)
    masterStore.watchBookData(bookId.value) // Ensure master data is loaded for filters
})

// Reset custom date range when switching to other filters
watch(selectedFilter, (newValue) => {
    if (newValue !== 'custom') {
        startDate.value = ''
        endDate.value = ''
    }
})

const filterOptions = computed(() => {
    return [
        { label: 'All', value: 'all' },
        { label: 'This Month', value: 'month' },
        { label: 'Last Month', value: 'last-month' },
        { label: 'Today', value: 'today' },
        { label: 'Yesterday', value: 'yesterday' },
        // { label: 'This Week', value: 'this-week' },
        // { label: 'Last Week', value: 'last-week' },
        { label: 'This Year', value: 'this-year' },
        { label: 'Last Year', value: 'last-year' },
        { label: 'Custom Date Range', value: 'custom' }
    ]
})

const activeFiltersCount = computed(() => {
    let count = 0
    if (filterCategory.value) count++
    if (filterPaymentMode.value) count++
    if (filterContact.value) count++
    if (filterProduct.value) count++
    return count
})

function openFilterModal() {
    tempFilterCategory.value = filterCategory.value
    tempFilterPaymentMode.value = filterPaymentMode.value
    tempFilterContact.value = filterContact.value
    tempFilterProduct.value = filterProduct.value
    showFilterModal.value = true
}

function applyFilters() {
    filterCategory.value = tempFilterCategory.value
    filterPaymentMode.value = tempFilterPaymentMode.value
    filterContact.value = tempFilterContact.value
    filterProduct.value = tempFilterProduct.value
    showFilterModal.value = false
}

function resetFilters() {
    tempFilterCategory.value = ''
    tempFilterPaymentMode.value = ''
    tempFilterContact.value = ''
    tempFilterProduct.value = ''
}

function clearFilter(type) {
    switch (type) {
        case 'category':
            filterCategory.value = ''
            break
        case 'payment':
            filterPaymentMode.value = ''
            break
        case 'contact':
            filterContact.value = ''
            break
        case 'product':
            filterProduct.value = ''
            break
    }
}

const filteredTransactions = computed(() => {
    let transactions = []

    // 1. Date Filtering
    if (selectedFilter.value === 'all') {
        transactions = transactionStore.transactions
    } else if (selectedFilter.value === 'custom') {
        if (startDate.value && endDate.value) {
            transactions = transactionStore.getFilteredTransactions({
                dateRange: 'custom',
                startDate: startDate.value,
                endDate: endDate.value
            })
        } else {
            transactions = transactionStore.transactions
        }
    } else {
        transactions = transactionStore.getFilteredTransactions({ dateRange: selectedFilter.value })
    }

    // 2. Advanced Filters
    if (filterCategory.value) {
        transactions = transactions.filter(t => t.category_id === filterCategory.value)
    }
    if (filterPaymentMode.value) {
        transactions = transactions.filter(t => t.payment_mode_id === filterPaymentMode.value)
    }
    if (filterContact.value) {
        transactions = transactions.filter(t => t.contact_id === filterContact.value)
    }
    if (filterProduct.value) {
        transactions = transactions.filter(t => t.products?.some(p => p.id === filterProduct.value))
    }

    // 3. Search Filtering
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        transactions = transactions.filter(t => {
            const descriptionMatch = t.description?.toLowerCase().includes(query)
            const productMatch = t.products?.some(p => p.name.toLowerCase().includes(query))
            const amountMatch = t.amount.toString().includes(query)
            return descriptionMatch || productMatch || amountMatch
        })
    }

    return transactions
})


const groupedTransactions = computed(() => {
    const groups = {}

    filteredTransactions.value.forEach(transaction => {
        const date = new Date(transaction.date)
        const dateKey = formatDate(date)

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
        const now = getNepalDate()
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
        <PageHeader :title="book?.name || 'Book Details'"
                    :back-route="{ name: 'dashboard' }">
            <template #actions>
                <button @click="router.push({ name: 'book-settings', params: { bookId } })"
                        class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
                    <svg class="h-6 w-6"
                         fill="none"
                         viewBox="0 0 24 24"
                         stroke="currentColor">
                        <path stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
                <button @click="openEditBook"
                        class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
                    <svg class="h-6 w-6"
                         fill="none"
                         viewBox="0 0 24 24"
                         stroke="currentColor">
                        <path stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
            </template>
        </PageHeader>

        <!-- Content -->
        <main class="p-4 space-y-4 pb-24">
            <!-- Stats Toggle -->
            <div class="flex justify-end">
                <button @click="showStats = !showStats"
                        class="text-[15px] text-[#007AFF] font-medium flex items-center gap-1">
                    {{ showStats ? 'Hide Stats' : 'Show Stats' }}
                    <svg class="h-4 w-4 transition-transform duration-200"
                         :class="{ 'rotate-180': showStats }"
                         fill="none"
                         viewBox="0 0 24 24"
                         stroke="currentColor">
                        <path stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            <!-- Stats -->
            <div v-show="showStats"
                 class="transition-all duration-300 ease-in-out">
                <StatsSummary :stats="filteredStats" />
            </div>

            <!-- Date Filters -->
            <div class="space-y-3">
                <div class="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-4 px-4">
                    <button v-for="opt in filterOptions.slice(0, -1)"
                            :key="opt.value"
                            @click="selectedFilter = opt.value"
                            :class="[
                                'rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                                selectedFilter === opt.value ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm'
                            ]">
                        {{ opt.label }}
                    </button>
                    <button @click="selectedFilter = 'custom'"
                            :class="[
                                'rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                                selectedFilter === 'custom' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm'
                            ]">
                        Custom
                    </button>
                </div>

                <!-- Custom Date Range Pickers -->
                <div v-if="selectedFilter === 'custom'"
                     class="grid grid-cols-2 gap-3 bg-white p-4 rounded-2xl shadow-sm">
                    <BaseInput v-model="startDate"
                               type="date"
                               label="Start Date" />
                    <BaseInput v-model="endDate"
                               type="date"
                               label="End Date" />
                </div>
            </div>

            <!-- Search & Advanced Filters -->
            <div class="flex gap-2">
                <div class="relative flex-1">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400"
                             fill="none"
                             viewBox="0 0 24 24"
                             stroke="currentColor">
                            <path stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input v-model="searchQuery"
                           type="text"
                           placeholder="Search transactions..."
                           class="w-full rounded-xl border-none bg-white py-2.5 pl-10 pr-4 text-[17px] shadow-sm ring-1 ring-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-[#007AFF] focus:outline-none" />
                </div>
                <button @click="openFilterModal()"
                        class="flex items-center justify-center w-11 h-11 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100 relative">
                    <svg class="h-6 w-6"
                         fill="none"
                         viewBox="0 0 24 24"
                         stroke="currentColor">
                        <path stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <div v-if="activeFiltersCount > 0"
                         class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#F2F2F7]">
                        {{ activeFiltersCount }}
                    </div>
                </button>
            </div>
            <!-- Selected Filters -->
            <div v-if="activeFiltersCount > 0"
                 class="flex flex-wrap gap-2 mt-2">
                <template v-if="filterCategory">
                    <span class="bg-gray-200 text-gray-800 text-sm px-2 py-1 rounded flex items-center">
                        Category: {{masterStore.categories.find(c => c.id === filterCategory).name}}
                        <button @click="clearFilter('category')"
                                class="ml-1 text-gray-500 hover:text-gray-700">&times;</button>
                    </span>
                </template>
                <template v-if="filterPaymentMode">
                    <span class="bg-gray-200 text-gray-800 text-sm px-2 py-1 rounded flex items-center">
                        Payment: {{masterStore.paymentModes.find(p => p.id === filterPaymentMode).name}}
                        <button @click="clearFilter('payment')"
                                class="ml-1 text-gray-500 hover:text-gray-700">&times;</button>
                    </span>
                </template>
                <template v-if="filterContact">
                    <span class="bg-gray-200 text-gray-800 text-sm px-2 py-1 rounded flex items-center">
                        Contact: {{masterStore.contacts.find(c => c.id === filterContact).name}}
                        <button @click="clearFilter('contact')"
                                class="ml-1 text-gray-500 hover:text-gray-700">&times;</button>
                    </span>
                </template>
                <template v-if="filterProduct">
                    <span class="bg-gray-200 text-gray-800 text-sm px-2 py-1 rounded flex items-center">
                        Product: {{masterStore.products.find(p => p.id === filterProduct).name}}
                        <button @click="clearFilter('product')"
                                class="ml-1 text-gray-500 hover:text-gray-700">&times;</button>
                    </span>
                </template>
            </div>

            <!-- Transactions -->
            <div class="space-y-6">
                <div v-if="groupedTransactions.length === 0"
                     class="py-10 text-center text-gray-500">
                    No transactions found.
                </div>

                <div v-for="group in groupedTransactions"
                     :key="group.date"
                     class="space-y-3">
                    <!-- Date Header -->
                    <div class="bg-gray-100 px-4 py-2 rounded-lg">
                        <h3 class="text-sm font-bold text-gray-900">{{ group.date }}</h3>
                    </div>

                    <!-- Transactions for this date -->
                    <div v-for="t in group.transactions"
                         :key="t.id"
                         @click="router.push({ name: 'edit-transaction', params: { bookId: book.id, id: t.id } })"
                         @contextmenu.prevent="confirmDelete(t)"
                         class="cursor-pointer transition-opacity active:opacity-70">
                        <TransactionCard :transaction="t" />
                    </div>
                </div>
            </div>
        </main>

        <!-- FAB -->
        <div class="fixed bottom-6 right-6 z-40">
            <button @click="goToCreateTransaction"
                    class="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105 active:scale-95">
                <svg class="h-6 w-6"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor">
                    <path stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>

        <!-- Delete Confirmation Modal -->
        <Modal :show="showDeleteModal"
               title="Delete Transaction"
               @close="showDeleteModal = false">
            <p class="text-gray-600">Are you sure you want to delete this transaction?</p>
            <div class="flex justify-end gap-3 mt-6">
                <BaseButton variant="ghost"
                            @click="showDeleteModal = false">Cancel</BaseButton>
                <BaseButton variant="danger"
                            @click="handleDelete">Delete</BaseButton>
            </div>
        </Modal>

        <!-- Edit Book Modal -->
        <Modal :show="showEditBookModal"
               title="Edit Book Name"
               @close="showEditBookModal = false">
            <div class="space-y-4">
                <BaseInput v-model="editBookName"
                           label="Book Name"
                           autoFocus />
                <div class="flex justify-end gap-3 mt-6">
                    <BaseButton variant="ghost"
                                @click="showEditBookModal = false">Cancel</BaseButton>
                    <BaseButton @click="saveBookName">Save</BaseButton>
                </div>
            </div>
        </Modal>

        <!-- Filter Modal -->
        <Modal :show="showFilterModal"
               title="Filter Transactions"
               @close="showFilterModal = false">
            <div class="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <SearchableSelect v-model="tempFilterCategory"
                                  label="Category"
                                  :options="[{ label: 'All Categories', value: '' }, ...masterStore.categories.map(c => ({ label: c.name, value: c.id }))]"
                                  placeholder="All Categories" />

                <SearchableSelect v-model="tempFilterPaymentMode"
                                  label="Payment Mode"
                                  :options="[{ label: 'All Payment Modes', value: '' }, ...masterStore.paymentModes.map(p => ({ label: p.name, value: p.id }))]"
                                  placeholder="All Payment Modes" />

                <SearchableSelect v-model="tempFilterContact"
                                  label="Contact"
                                  :options="[{ label: 'All Contacts', value: '' }, ...masterStore.contacts.map(c => ({ label: c.name, value: c.id }))]"
                                  placeholder="All Contacts" />

                <div class="flex justify-end gap-3 mt-6">
                    <BaseButton variant="ghost"
                                @click="resetFilters">Reset</BaseButton>
                    <BaseButton @click="applyFilters">Apply</BaseButton>
                </div>
            </div>
        </Modal>
    </PageLayout>
</template>
