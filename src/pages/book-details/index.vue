<script setup>
import { ref, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { formatDate, getNepalDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/moneyUtils"
import { useBookStore } from "@/store/bookStore"
import { useTransactionStore } from "@/store/transactionStore"
import { useCategoryStore } from "@/store/categoryStore"
import { useContactStore } from "@/store/contactStore"
import { usePaymentModeStore } from "@/store/paymentModeStore"
import { useProductStore } from "@/store/productStore"
import IconCaretDown from "@/assets/icons/IconCaretDown.vue"
import IconSettings from "@/assets/icons/IconSettings.vue"
import IconEdit from "@/assets/icons/IconEdit.vue"
import IconFilter from "@/assets/icons/IconFilter.vue"
import IconChartBar from "@/assets/icons/IconChartBar.vue"
import SyncIndicator from "@/components/common/SyncIndicator.vue"
import BaseSearchableSelect from "@/components/common/BaseSearchableSelect.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import FloatingActionButton from "@/components/common/FloatingActionButton.vue"
import BaseSearchInput from "@/components/common/BaseSearchInput.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import TransactionCard from "@/pages/book-details/TransactionCard.vue"
import StatsSummary from "@/pages/book-details/StatsSummary.vue"
import DeleteBook from "@/pages/book-details/DeleteBook.vue"
import DateRangeTabs from "@/components/common/DateRangeTabs.vue"
import ActiveFilterChips from "@/components/common/ActiveFilterChips.vue"

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const transactionStore = useTransactionStore()
const categoryStore = useCategoryStore()
const contactStore = useContactStore()
const paymentModeStore = usePaymentModeStore()
const productStore = useProductStore()

const book = ref(null)
const bookId = ref(null)
const selectedFilter = ref("month") // Default to month
const startDate = ref("")
const endDate = ref("")
const showDeleteModal = ref(false)
const transactionToDelete = ref(null)

// Edit Book
const showEditBookModal = ref(false)
const editBookName = ref("")

const showStats = ref(false)
const searchQuery = ref("")
const showFilterModal = ref(false)

// Actual filters applied
const filterCategory = ref("")
const filterPaymentMode = ref("")
const filterContact = ref("")
const filterProduct = ref("")

// Temporary filters for modal
const tempFilterCategory = ref("")
const tempFilterPaymentMode = ref("")
const tempFilterContact = ref("")
const tempFilterProduct = ref("")

onMounted(async () => {
  const bookIdParam = parseInt(route.params.id)
  if (!bookIdParam) return

  bookId.value = bookIdParam
  book.value = await bookStore.getBook(bookId.value)
  transactionStore.setBookId(bookId.value)

  categoryStore.watchCategories(bookId.value)
  paymentModeStore.watchPaymentModes(bookId.value)
  productStore.watchProducts(bookId.value)
  // Contacts are global, already watched/loaded in store

  // Restore filters from URL query params
  const query = route.query
  if (query.filter) selectedFilter.value = query.filter
  if (query.startDate) startDate.value = query.startDate
  if (query.endDate) endDate.value = query.endDate
  if (query.category) filterCategory.value = parseInt(query.category)
  if (query.paymentMode) filterPaymentMode.value = parseInt(query.paymentMode)
  if (query.contact) filterContact.value = parseInt(query.contact)
  if (query.product) filterProduct.value = parseInt(query.product)
  if (query.search) searchQuery.value = query.search
})

// Reset custom date range when switching to other filters

// Persist filters to URL query params
watch(
  [selectedFilter, startDate, endDate, filterCategory, filterPaymentMode, filterContact, filterProduct, searchQuery],
  () => {
    const query = {}
    if (selectedFilter.value !== "month") query.filter = selectedFilter.value
    if (startDate.value) query.startDate = startDate.value
    if (endDate.value) query.endDate = endDate.value
    if (filterCategory.value) query.category = filterCategory.value
    if (filterPaymentMode.value) query.paymentMode = filterPaymentMode.value
    if (filterContact.value) query.contact = filterContact.value
    if (filterProduct.value) query.product = filterProduct.value
    if (searchQuery.value) query.search = searchQuery.value

    // Use replace to avoid adding to browser history
    router.replace({ query })
  }
)

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
  tempFilterCategory.value = ""
  tempFilterPaymentMode.value = ""
  tempFilterContact.value = ""
  tempFilterProduct.value = ""
}

function clearFilter(type) {
  switch (type) {
    case "category":
      filterCategory.value = ""
      break
    case "payment":
      filterPaymentMode.value = ""
      break
    case "contact":
      filterContact.value = ""
      break
    case "product":
      filterProduct.value = ""
      break
  }
}

const filteredTransactions = computed(() => {
  let transactions = []

  // 1. Date Filtering
  if (selectedFilter.value === "all") {
    transactions = transactionStore.transactions
  } else if (startDate.value && endDate.value) {
    // Use custom date range logic for all filters that have dates
    transactions = transactionStore.getFilteredTransactions({
      dateRange: "custom",
      startDate: startDate.value,
      endDate: endDate.value,
    })
  } else {
    // Fallback (should not happen if DateRangeTabs works correctly for non-all filters)
    transactions = transactionStore.transactions
  }

  // 2. Advanced Filters
  if (filterCategory.value) {
    transactions = transactions.filter((t) => {
      const productCategoryIds = t.products?.filter((p) => p.category_id)?.map((p) => p.category_id) || []

      return [...t.category_ids, ...productCategoryIds].includes(filterCategory.value)
    })
  }
  if (filterPaymentMode.value) {
    transactions = transactions.filter((t) => t.payment_mode_id === filterPaymentMode.value)
  }
  if (filterContact.value) {
    transactions = transactions.filter((t) => t.contact_id === filterContact.value)
  }
  if (filterProduct.value) {
    transactions = transactions.filter((t) => t.products?.some((p) => p.product_id === filterProduct.value))
  }

  // 3. Search Filtering
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    transactions = transactions.filter((t) => {
      const descriptionMatch = t.description?.toLowerCase().includes(query)
      const productMatch = t.products?.some((p) => p.name?.toLowerCase()?.includes(query))
      const amountMatch = t.amount.toString().includes(query)
      return descriptionMatch || productMatch || amountMatch
    })
  }

  return transactions
})

const visibleLimit = ref(50)

const paginatedTransactions = computed(() => {
  return filteredTransactions.value.slice(0, visibleLimit.value)
})

const groupedTransactions = computed(() => {
  const groups = {}

  paginatedTransactions.value.forEach((transaction) => {
    const date = new Date(transaction.date)
    const dateKey = formatDate(date)

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        timestamp: date.getTime(),
        transactions: [],
        amount: 0,
      }
    }

    groups[dateKey].transactions.push(transaction)
    groups[dateKey].amount += transaction.amount
  })

  // Convert to array and sort by timestamp (most recent first)
  return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp)
})

const hasMoreTransactions = computed(() => {
  return visibleLimit.value < filteredTransactions.value.length
})

function loadMore() {
  visibleLimit.value += 50
}

// Reset pagination when filters change
watch([selectedFilter, filterCategory, filterPaymentMode, filterContact, filterProduct, searchQuery], () => {
  visibleLimit.value = 50
})

const filteredStats = computed(() => {
  let totalIn = 0
  let totalOut = 0
  let openingBalance = 0

  // Calculate opening balance (net balance from transactions before the filter period)
  if (selectedFilter.value !== "all") {
    let filterStartDate = null

    if (startDate.value) {
      filterStartDate = new Date(startDate.value)
      filterStartDate.setHours(0, 0, 0, 0)
    }

    // Calculate balance from all transactions before the filter start date
    if (filterStartDate) {
      transactionStore.transactions.forEach((t) => {
        const tDate = new Date(t.date)
        tDate.setHours(0, 0, 0, 0)

        if (tDate < filterStartDate) {
          const amount = parseFloat(t.amount) || 0
          if (t.type === "in") openingBalance += amount
          else if (t.type === "out") openingBalance -= amount
        }
      })
    }
  }

  // Calculate current period stats
  filteredTransactions.value.forEach((t) => {
    const amount = parseFloat(t.amount) || 0
    if (t.type === "in") totalIn += amount
    else if (t.type === "out") totalOut += amount
  })

  const netBalance = totalIn - totalOut
  const closingBalance = openingBalance + netBalance

  return {
    totalIn,
    totalOut,
    netBalance,
    openingBalance,
    closingBalance,
  }
})

function goToCreateTransaction() {
  router.push({ name: "create-transaction", params: { bookId: bookId.value } })
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
    <PageHeader :title="book?.name || 'Book Details'" :back-route="{ name: 'dashboard' }">
      <template #actions>
        <button
          @click="router.push({ name: 'book-charts', params: { bookId } })"
          class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
        >
          <IconChartBar class="h-5 w-5" />
        </button>
        <button
          @click="router.push({ name: 'book-settings-products', params: { bookId } })"
          class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
        >
          <IconSettings />
        </button>
        <button @click="openEditBook" class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
          <IconEdit />
        </button>
      </template>
    </PageHeader>

    <!-- Content -->
    <main class="p-4 space-y-4 pb-24">
      <!-- Stats Toggle -->
      <div class="flex justify-between items-center">
        <DeleteBook v-if="bookId" :book-id="bookId" />

        <SyncIndicator />

        <button @click="showStats = !showStats" class="text-[15px] text-[#007AFF] font-medium flex items-center gap-1">
          {{ showStats ? "Hide Stats" : "Show Stats" }}
          <IconCaretDown class="transition-transform duration-200" :class="{ 'rotate-180': showStats }" />
        </button>
      </div>

      <!-- Stats -->
      <div v-show="showStats" class="transition-all duration-300 ease-in-out">
        <StatsSummary :stats="filteredStats" />
      </div>

      <!-- Date Filters -->
      <DateRangeTabs v-model="selectedFilter" v-model:start-date="startDate" v-model:end-date="endDate" />

      <!-- Search & Advanced Filters -->
      <div class="flex gap-2">
        <BaseSearchInput v-model="searchQuery" placeholder="Search transactions..." class="flex-1" />
        <button
          @click="openFilterModal()"
          class="flex items-center justify-center w-11 rounded-sm bg-white shadow-sm ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100 relative"
        >
          <IconFilter />
          <div
            v-if="activeFiltersCount > 0"
            class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#F2F2F7]"
          >
            {{ activeFiltersCount }}
          </div>
        </button>
      </div>

      <!-- Selected Filters -->
      <ActiveFilterChips
        v-if="activeFiltersCount > 0"
        :filters="{
          category: filterCategory,
          paymentMode: filterPaymentMode,
          contact: filterContact,
          product: filterProduct,
        }"
        @clear="clearFilter"
      />

      <!-- Transactions -->
      <div class="space-y-6">
        <div v-if="groupedTransactions.length === 0" class="py-10 text-center text-gray-500">
          No transactions found.
        </div>

        <div v-for="group in groupedTransactions" :key="group.date" class="space-y-3">
          <!-- Date Header -->
          <div class="bg-gray-100 px-4 py-2 rounded-lg text-sm flex justify-between items-center">
            <h3 class="font-bold text-gray-900">{{ group.date }}</h3>
            <span class="text-gray-600">{{ formatCurrency(group.amount) }}</span>
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

        <!-- Load More Button -->
        <div v-if="hasMoreTransactions" class="flex justify-center py-4">
          <BaseButton variant="secondary" @click="loadMore"> Load More </BaseButton>
        </div>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <BaseModal :show="showDeleteModal" title="Delete Transaction" @close="showDeleteModal = false">
      <p class="text-gray-600">Are you sure you want to delete this transaction?</p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="handleDelete">Delete</BaseButton>
      </div>
    </BaseModal>

    <!-- Edit Book Modal -->
    <BaseModal :show="showEditBookModal" title="Edit Book Name" @close="showEditBookModal = false">
      <div class="space-y-4">
        <BaseInput v-model="editBookName" label="Book Name" autoFocus />
        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showEditBookModal = false">Cancel</BaseButton>
          <BaseButton @click="saveBookName">Save</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Filter Modal -->
    <BaseModal :show="showFilterModal" title="Filter Transactions" @close="showFilterModal = false">
      <div class="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <BaseSearchableSelect
          v-model="tempFilterCategory"
          label="Category"
          :options="[
            { label: 'All Categories', value: '' },
            ...categoryStore.categories.map((c) => ({ label: c.name, value: c.id, description: c.description })),
          ]"
          placeholder="All Categories"
        />

        <BaseSearchableSelect
          v-model="tempFilterPaymentMode"
          label="Payment Mode"
          :options="[
            { label: 'All Payment Modes', value: '' },
            ...paymentModeStore.paymentModes.map((p) => ({ label: p.name, value: p.id, description: p.description })),
          ]"
          placeholder="All Payment Modes"
        />

        <BaseSearchableSelect
          v-model="tempFilterContact"
          label="Contact"
          :options="[
            { label: 'All Contacts', value: '' },
            ...contactStore.contacts.map((c) => ({ label: c.name, value: c.id, description: c.phone })),
          ]"
          placeholder="All Contacts"
        />

        <BaseSearchableSelect
          v-model="tempFilterProduct"
          label="Product"
          :options="[
            { label: 'All Products', value: '' },
            ...productStore.products.map((p) => ({ label: p.name, value: p.id, description: p.description })),
          ]"
          placeholder="All Products"
        />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="resetFilters">Reset</BaseButton>
          <BaseButton @click="applyFilters">Apply</BaseButton>
        </div>
      </div>
    </BaseModal>
  </PageLayout>

  <!-- FAB -->
  <FloatingActionButton @click="goToCreateTransaction" />
</template>
