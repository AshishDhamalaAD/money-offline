<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue"
import { useRoute, useRouter } from "vue-router"

import { formatDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/moneyUtils"
import { setLastBookId } from "@/utils/lastBook"
import { useBookStore } from "@/store/bookStore"
import { useTransactionStore } from "@/store/transactionStore"
import { useSyncStore } from "@/store/syncStore"
import { useCategoryStore } from "@/store/categoryStore"
import { useContactStore } from "@/store/contactStore"
import { usePaymentModeStore } from "@/store/paymentModeStore"
import { useProductStore } from "@/store/productStore"
import IconCaretDown from "@/assets/icons/IconCaretDown.vue"
import IconSettings from "@/assets/icons/IconSettings.vue"
import IconEdit from "@/assets/icons/IconEdit.vue"
import IconFilter from "@/assets/icons/IconFilter.vue"
import IconChartBar from "@/assets/icons/IconChartBar.vue"
import IconSelect from "@/assets/icons/IconSelect.vue"
import SyncIndicator from "@/components/common/SyncIndicator.vue"
import BaseSearchableSelect from "@/components/common/BaseSearchableSelect.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseSnackbar from "@/components/common/BaseSnackbar.vue"
import BaseToast from "@/components/common/BaseToast.vue"
import AttachmentViewer from "@/components/common/AttachmentViewer.vue"
import FloatingActionButton from "@/components/common/FloatingActionButton.vue"
import PullToRefresh from "@/components/common/PullToRefresh.vue"
import SwipeableTransaction from "@/components/common/SwipeableTransaction.vue"
import BaseSearchInput from "@/components/common/BaseSearchInput.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import TransactionCard from "@/pages/book-details/TransactionCard.vue"
import StatsSummary from "@/pages/book-details/StatsSummary.vue"
import DeleteBook from "@/pages/book-details/DeleteBook.vue"
import DateRangeTabs from "@/components/common/DateRangeTabs.vue"
import ActiveFilterChips from "@/components/common/ActiveFilterChips.vue"
import BaseBottomSheet from "@/components/common/BaseBottomSheet.vue"

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const transactionStore = useTransactionStore()
const syncStore = useSyncStore()
const categoryStore = useCategoryStore()
const contactStore = useContactStore()
const paymentModeStore = usePaymentModeStore()
const productStore = useProductStore()

const book = ref(null)
const bookId = ref(null)
const selectedFilter = ref("month") // Default to month
const startDate = ref("")
const endDate = ref("")
const showActionSheet = ref(false)
const selectedTransaction = ref(null)

// Action Sheet & Copy/Move
const showTargetBookModal = ref(false)
const targetAction = ref("copy") // 'copy' | 'move'
const selectedTargetBookId = ref("")
const isBulkTarget = ref(false)
const isProcessing = ref(false)

// Swipe coordination: only one row is open at a time.
const openSwipeId = ref(null)

// Selection mode
const isSelecting = ref(false)
const selectedIds = ref([])

// Undo snackbar
const showSnackbar = ref(false)
const snackbarMessage = ref("")
const snackbarRevision = ref(0)
const pendingDeletes = ref([])

// Toast
const showToast = ref(false)
const toastMessage = ref("")
const toastType = ref("error")

// Attachment viewer
const showAttachmentViewer = ref(false)
const viewerImages = ref([])
const viewerIndex = ref(0)

const otherBooks = computed(() => {
  return bookStore.books.filter((b) => b.id !== bookId.value)
})

const selectedIdSet = computed(() => new Set(selectedIds.value))

function showToastMessage(message, type = "error") {
  showToast.value = false
  toastMessage.value = message
  toastType.value = type
  nextTick(() => {
    showToast.value = true
  })
}

function closeOpenSwipe() {
  openSwipeId.value = null
}

function onSwipeClose(id) {
  if (openSwipeId.value === id) openSwipeId.value = null
}

function openTransactionActionSheet(transaction) {
  closeOpenSwipe()
  selectedTransaction.value = transaction
  showActionSheet.value = true
}

function onTransactionTap(transaction) {
  router.push({ name: "edit-transaction", params: { bookId: bookId.value, id: transaction.id } })
}

function onTransactionEdit(transaction) {
  router.push({ name: "edit-transaction", params: { bookId: bookId.value, id: transaction.id } })
}

function onTransactionDuplicate(transaction) {
  selectedTransaction.value = transaction
  initiateDuplicate()
}

function initiateCopy() {
  showActionSheet.value = false
  isBulkTarget.value = false
  targetAction.value = "copy"
  selectedTargetBookId.value = ""
  showTargetBookModal.value = true
}

function initiateMove() {
  showActionSheet.value = false
  isBulkTarget.value = false
  targetAction.value = "move"
  selectedTargetBookId.value = ""
  showTargetBookModal.value = true
}

function initiateBulkMove() {
  if (selectedIds.value.length === 0) return
  isBulkTarget.value = true
  targetAction.value = "move"
  selectedTargetBookId.value = ""
  showTargetBookModal.value = true
}

function closeTargetBookModal() {
  showTargetBookModal.value = false
  selectedTargetBookId.value = ""
  isBulkTarget.value = false
}

async function executeCopyOrMove() {
  if (!selectedTargetBookId.value) return

  const ids = isBulkTarget.value
    ? [...selectedIds.value]
    : selectedTransaction.value
      ? [selectedTransaction.value.id]
      : []

  if (ids.length === 0) return

  isProcessing.value = true
  try {
    for (const id of ids) {
      if (targetAction.value === "copy") {
        await transactionStore.copyTransaction(id, selectedTargetBookId.value)
      } else {
        await transactionStore.moveTransaction(id, selectedTargetBookId.value)
      }
    }

    const verb = targetAction.value === "copy" ? "copied" : "moved"
    showToastMessage(ids.length === 1 ? `Transaction ${verb}.` : `${ids.length} transactions ${verb}.`, "success")

    const wasBulk = isBulkTarget.value
    closeTargetBookModal()
    selectedTransaction.value = null
    if (wasBulk) exitSelection()
  } catch (e) {
    console.error("Failed to copy/move transaction:", e)
    showToastMessage(`Could not ${targetAction.value} transaction${ids.length > 1 ? "s" : ""}.`, "error")
  } finally {
    isProcessing.value = false
  }
}

const showDuplicateDescriptionModal = ref(false)

function initiateDuplicate() {
  showActionSheet.value = false
  if (!selectedTransaction.value) return

  const t = selectedTransaction.value

  // If the transaction has a description, ask via modal whether to include it
  if (t.description && t.description.trim()) {
    showDuplicateDescriptionModal.value = true
  } else {
    executeDuplicate(false)
  }
}

function executeDuplicate(includeDescription) {
  showDuplicateDescriptionModal.value = false
  if (!selectedTransaction.value) return

  const t = selectedTransaction.value

  // Normalize description for form (strip HTML paragraph formatting)
  let description = ""
  if (includeDescription && t.description) {
    description = t.description.replace(/<\/p>\s*<p>/g, "\n").replace(/<\/?p>/g, "")
  }

  // Build a current local timestamp for the new transaction
  const now = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  const dateLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

  // Strip enriched runtime fields from products before passing through state
  const products = (t.products || []).map(({ name, attachments, ...rest }) => rest)

  router.push({
    name: "create-transaction",
    params: { bookId: bookId.value },
    state: {
      prefill: JSON.stringify({
        type: t.type,
        date: dateLocal,
        amount: t.amount,
        category_ids: t.category_ids || [],
        payment_mode_id: t.payment_mode_id || "",
        contact_id: t.contact_id || "",
        description,
        products,
        discount: t.discount || 0,
        charge: t.charge || 0,
      }),
    },
  })
}

async function handleDeleteTransaction(transaction) {
  if (!transaction) return

  try {
    const snapshot = await transactionStore.deleteTransaction(transaction.id)
    if (selectedTransaction.value?.id === transaction.id) selectedTransaction.value = null
    queueUndo(snapshot ? [snapshot] : [])
  } catch (e) {
    console.error("Failed to delete transaction:", e)
    showToastMessage("Could not delete transaction.", "error")
  }
}

async function deleteSelectedFromSheet() {
  const transaction = selectedTransaction.value
  showActionSheet.value = false
  if (!transaction) return
  await handleDeleteTransaction(transaction)
}

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

// Sticky month headers
const headerOffset = ref(64)
const activeMonth = ref("")
let scrollFrame = null

function measureHeader() {
  const header = document.querySelector("header")
  if (header) headerOffset.value = header.offsetHeight
}

function updateActiveMonth() {
  scrollFrame = null
  const sections = Array.from(document.querySelectorAll("[data-month-key]"))
  if (sections.length === 0) return

  const threshold = headerOffset.value + 12
  let current = sections[0].dataset.monthKey

  for (const section of sections) {
    if (section.getBoundingClientRect().top <= threshold) current = section.dataset.monthKey
    else break
  }

  activeMonth.value = current
}

function onPageScroll() {
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(updateActiveMonth)
}

function jumpToMonth(key) {
  const section = document.querySelector(`[data-month-key="${key}"]`)
  if (!section) return

  const top = section.getBoundingClientRect().top + window.scrollY - headerOffset.value
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
  activeMonth.value = key
}

onMounted(async () => {
  const bookIdParam = parseInt(route.params.id)
  if (!bookIdParam) return

  bookId.value = bookIdParam
  setLastBookId(bookIdParam)
  book.value = await bookStore.getBook(bookId.value)

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

  // The list itself is paged: Dexie reads only the loaded window, so the page
  // never holds the whole book in memory.
  transactionStore.openTransactionList(pageFilters.value)

  await nextTick()
  measureHeader()
  updateActiveMonth()

  window.addEventListener("scroll", onPageScroll, { passive: true })
  window.addEventListener("resize", measureHeader)
})

onUnmounted(() => {
  transactionStore.closeTransactionList()
  window.removeEventListener("scroll", onPageScroll)
  window.removeEventListener("resize", measureHeader)
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
})

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
  },
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

// The store reads this window straight from Dexie using the [book_id+date]
// index, so date ranges, advanced filters and search never load the whole book.
const pageFilters = computed(() => ({
  bookId: bookId.value,
  startDate: selectedFilter.value === "all" ? "" : startDate.value,
  endDate: selectedFilter.value === "all" ? "" : endDate.value,
  type: "all",
  categoryId: filterCategory.value || null,
  paymentModeId: filterPaymentMode.value || null,
  contactId: filterContact.value || null,
  productId: filterProduct.value || null,
  search: searchQuery.value || "",
}))

const filteredTransactions = computed(() => transactionStore.listTransactions)

const monthGroups = computed(() => {
  const months = new Map()

  filteredTransactions.value.forEach((transaction) => {
    const date = new Date(transaction.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const amount = parseFloat(transaction.amount) || 0

    if (!months.has(monthKey)) {
      months.set(monthKey, {
        key: monthKey,
        label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        shortLabel: date.toLocaleDateString("en-US", { month: "short" }),
        timestamp: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        amount: 0,
        days: new Map(),
      })
    }

    const month = months.get(monthKey)
    month.amount += amount

    const dateKey = formatDate(date)
    if (!month.days.has(dateKey)) {
      month.days.set(dateKey, {
        date: dateKey,
        timestamp: date.getTime(),
        transactions: [],
        amount: 0,
      })
    }

    const day = month.days.get(dateKey)
    day.transactions.push(transaction)
    day.amount += amount
  })

  return Array.from(months.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((month) => ({
      ...month,
      days: Array.from(month.days.values()).sort((a, b) => b.timestamp - a.timestamp),
    }))
})

const hasScrubber = computed(() => monthGroups.value.length > 1)

const hasMoreTransactions = computed(() => transactionStore.listHasMore)

function loadMore() {
  transactionStore.loadMoreTransactions()
}

// A filter change starts a fresh page from Dexie and clears any selection.
watch(pageFilters, (filters) => {
  transactionStore.setTransactionListFilters(filters)
  if (isSelecting.value) exitSelection()
})

watch(monthGroups, () => {
  nextTick(updateActiveMonth)
})

// Period totals are streamed from Dexie rather than derived from the loaded
// page, so "Show Stats" stays correct even when only one page is on screen.
const filteredStats = ref({
  totalIn: 0,
  totalOut: 0,
  netBalance: 0,
  openingBalance: 0,
  closingBalance: 0,
})

let statsRequest = 0

async function refreshStats() {
  const request = ++statsRequest
  const filters = pageFilters.value
  if (!filters.bookId) return

  try {
    const [totals, openingBalance] = await Promise.all([
      transactionStore.getTransactionTotals(filters),
      selectedFilter.value === "all" || !filters.startDate
        ? 0
        : transactionStore.getBalanceBefore(filters.bookId, filters.startDate),
    ])

    if (request !== statsRequest) return

    filteredStats.value = {
      totalIn: totals.totalIn,
      totalOut: totals.totalOut,
      netBalance: totals.netBalance,
      openingBalance,
      closingBalance: openingBalance + totals.netBalance,
    }
  } catch (e) {
    console.error("Failed to calculate transaction stats:", e)
  }
}

watch([pageFilters, () => transactionStore.listVersion], refreshStats, { immediate: true })


function goToCreateTransaction() {
  router.push({ name: "create-transaction", params: { bookId: bookId.value } })
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

// Selection mode
function enterSelection() {
  closeOpenSwipe()
  showActionSheet.value = false
  isSelecting.value = true
  selectedIds.value = []
}

function exitSelection() {
  isSelecting.value = false
  selectedIds.value = []
}

function toggleSelection(id) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((selectedId) => selectedId !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

const allFilteredSelected = computed(() => {
  return (
    filteredTransactions.value.length > 0 &&
    filteredTransactions.value.every((transaction) => selectedIdSet.value.has(transaction.id))
  )
})

function toggleSelectAll() {
  // Selects the rows loaded so far; older pages stay out of memory until the
  // user loads them.
  if (allFilteredSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredTransactions.value.map((transaction) => transaction.id)
  }
}

async function bulkDeleteSelected() {
  const ids = [...selectedIds.value]
  if (ids.length === 0) return

  isProcessing.value = true
  try {
    const snapshots = await transactionStore.deleteTransactions(ids)
    exitSelection()
    queueUndo(snapshots)
  } catch (e) {
    console.error("Failed to delete transactions:", e)
    showToastMessage("Could not delete transactions.", "error")
  } finally {
    isProcessing.value = false
  }
}

// Undo
function queueUndo(snapshots) {
  if (!snapshots || snapshots.length === 0) return

  pendingDeletes.value = [...pendingDeletes.value, ...snapshots]
  const count = pendingDeletes.value.length
  snackbarMessage.value = count === 1 ? "Transaction deleted" : `${count} transactions deleted`
  snackbarRevision.value += 1
  showSnackbar.value = true
}

async function undoDeletes() {
  const snapshots = pendingDeletes.value
  pendingDeletes.value = []
  showSnackbar.value = false
  if (snapshots.length === 0) return

  try {
    await transactionStore.restoreTransactions(snapshots)
    showToastMessage(snapshots.length === 1 ? "Transaction restored." : `${snapshots.length} transactions restored.`, "success")
  } catch (e) {
    console.error("Failed to restore transactions:", e)
    showToastMessage("Could not restore transactions.", "error")
  }
}

function onSnackbarClose() {
  showSnackbar.value = false
  pendingDeletes.value = []
}

// Attachment viewer
function openAttachments({ images, index }) {
  viewerImages.value = images
  viewerIndex.value = index
  showAttachmentViewer.value = true
}

// Pull to refresh
async function handleRefresh() {
  const result = await syncStore.triggerSync()
  if (result?.success) {
    showToastMessage("Synced successfully.", "success")
  } else {
    showToastMessage(result?.message || "Sync failed.", "error")
  }
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="book?.name || 'Book Details'" :back-route="{ name: 'dashboard' }">
      <template #actions>
        <button
          @click="router.push({ name: 'book-charts', params: { bookId } })"
          class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <IconChartBar class="h-5 w-5" />
        </button>
        <button
          @click="router.push({ name: 'book-settings-products', params: { bookId } })"
          class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <IconSettings />
        </button>
        <button
          @click="openEditBook"
          class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <IconEdit />
        </button>
      </template>
    </PageHeader>

    <!-- Content -->
    <main class="pl-4 pt-4" :class="[hasScrubber ? 'pr-10' : 'pr-4', isSelecting ? 'pb-44' : 'pb-24']">
      <PullToRefresh :on-refresh="handleRefresh" :disabled="isSelecting">
        <div class="space-y-4">
          <!-- Stats Toggle -->
          <div class="flex justify-between items-center">
            <DeleteBook v-if="bookId" :book-id="bookId" />

            <SyncIndicator />

            <button
              @click="showStats = !showStats"
              class="text-[15px] text-[#007AFF] font-medium flex items-center gap-1"
            >
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
              @click="enterSelection"
              :disabled="filteredTransactions.length === 0"
              class="flex items-center justify-center w-11 rounded-sm bg-white shadow-sm ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 dark:bg-gray-900 dark:ring-gray-800 dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-800"
              aria-label="Select transactions"
            >
              <IconSelect />
            </button>
            <button
              @click="openFilterModal()"
              aria-label="Filter transactions"
              class="flex items-center justify-center w-11 rounded-sm bg-white shadow-sm ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100 relative dark:bg-gray-900 dark:ring-gray-800 dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-800"
            >
              <IconFilter />
              <div
                v-if="activeFiltersCount > 0"
                class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#F2F2F7] dark:border-gray-900"
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
            <div v-if="monthGroups.length === 0" class="py-10 text-center text-gray-500 dark:text-gray-400">
              {{ transactionStore.listLoading ? "Loading transactions..." : "No transactions found." }}
            </div>

            <section
              v-for="month in monthGroups"
              :key="month.key"
              :data-month-key="month.key"
              class="space-y-3"
            >
              <!-- Sticky month header -->
              <div
                class="sticky z-10 flex items-center justify-between rounded-sm bg-gray-50/95 py-2 backdrop-blur dark:bg-gray-950/95"
                :style="{ top: `${headerOffset}px` }"
              >
                <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                  {{ month.label }}
                </h2>
                <span class="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {{ formatCurrency(month.amount) }}
                </span>
              </div>

              <div v-for="group in month.days" :key="group.date" class="space-y-3">
                <!-- Date Header -->
                <div class="bg-gray-100 px-4 py-2 rounded-lg text-sm flex justify-between items-center dark:bg-gray-800">
                  <h3 class="font-bold text-gray-900 dark:text-gray-100">{{ group.date }}</h3>
                  <span class="text-gray-600 dark:text-gray-300">{{ formatCurrency(group.amount) }}</span>
                </div>

                <!-- Transactions for this date -->
                <SwipeableTransaction
                  v-for="t in group.transactions"
                  :key="t.id"
                  :transaction="t"
                  :open="openSwipeId === t.id"
                  :selecting="isSelecting"
                  :selected="selectedIdSet.has(t.id)"
                  @open="openSwipeId = $event"
                  @close="onSwipeClose"
                  @select="onTransactionTap"
                  @edit="onTransactionEdit"
                  @duplicate="onTransactionDuplicate"
                  @delete="handleDeleteTransaction"
                  @longpress="openTransactionActionSheet"
                  @toggle-select="toggleSelection"
                >
                  <TransactionCard :transaction="t" @view-attachments="openAttachments" />
                </SwipeableTransaction>
              </div>
            </section>

            <!-- Load More Button -->
            <div v-if="hasMoreTransactions" class="flex justify-center py-4">
              <BaseButton variant="secondary" @click="loadMore"> Load More </BaseButton>
            </div>
          </div>
        </div>
      </PullToRefresh>
    </main>

    <!-- Month scrubber -->
    <nav
      v-if="hasScrubber"
      class="fixed right-1 top-1/2 z-30 flex max-h-[60vh] -translate-y-1/2 flex-col items-center gap-0.5 overflow-y-auto rounded-full bg-white/85 px-1 py-2 shadow-sm ring-1 ring-gray-200 backdrop-blur no-scrollbar dark:bg-gray-900/85 dark:ring-gray-700"
      aria-label="Jump to month"
    >
      <button
        v-for="month in monthGroups"
        :key="month.key"
        type="button"
        class="w-6 rounded-full py-1 text-[10px] font-semibold uppercase leading-none transition-colors"
        :class="
          activeMonth === month.key
            ? 'bg-indigo-600 text-white'
            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        "
        :aria-label="month.label"
        :aria-current="activeMonth === month.key ? 'true' : undefined"
        @click="jumpToMonth(month.key)"
      >
        {{ month.shortLabel }}
      </button>
    </nav>

    <!-- Selection bar -->
    <div
      v-if="isSelecting"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-4 pt-3 pb-safe-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="mx-auto max-w-lg">
        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="text-sm font-medium text-gray-600 dark:text-gray-300"
            @click="exitSelection"
          >
            Cancel
          </button>
          <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ selectedIds.length }} selected
          </span>
          <button
            type="button"
            class="text-sm font-medium text-indigo-600 dark:text-indigo-300"
            @click="toggleSelectAll"
          >
            {{ allFilteredSelected ? "Clear" : "Select all" }}
          </button>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <BaseButton
            variant="secondary"
            :disabled="selectedIds.length === 0 || isProcessing"
            @click="initiateBulkMove"
          >
            Move
          </BaseButton>
          <BaseButton
            variant="danger"
            :disabled="selectedIds.length === 0 || isProcessing"
            :loading="isProcessing"
            @click="bulkDeleteSelected"
          >
            Delete
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Transaction Action Sheet -->
    <BaseBottomSheet v-model="showActionSheet" :title="'Transaction Options'">
      <div class="flex flex-col gap-2">
        <button
          @click="initiateCopy"
          class="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-3 text-gray-700 dark:text-gray-200"
        >
          <span class="i-heroicons-document-duplicate w-5 h-5"></span>
          Copy Transaction
        </button>
        <button
          @click="initiateMove"
          class="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-3 text-gray-700 dark:text-gray-200"
        >
          <span class="i-heroicons-arrow-right-on-rectangle w-5 h-5"></span>
          Move Transaction
        </button>
        <button
          @click="initiateDuplicate"
          class="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-3 text-gray-700 dark:text-gray-200"
        >
          <span class="i-heroicons-clipboard-document w-5 h-5"></span>
          Duplicate Here
        </button>
        <button
          @click="deleteSelectedFromSheet"
          class="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-3 text-red-600"
        >
          <span class="i-heroicons-trash w-5 h-5"></span>
          Delete Transaction
        </button>
      </div>
    </BaseBottomSheet>

    <!-- Copy/Move Target Book Modal -->
    <BaseModal
      :show="showTargetBookModal"
      :title="
        isBulkTarget
          ? `${targetAction === 'copy' ? 'Copy' : 'Move'} ${selectedIds.length} transactions`
          : targetAction === 'copy'
            ? 'Copy Transaction'
            : 'Move Transaction'
      "
      @close="closeTargetBookModal"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Select the book where you want to {{ targetAction }}
          {{ isBulkTarget ? "these transactions" : "this transaction" }}.
        </p>

        <BaseSearchableSelect
          v-model="selectedTargetBookId"
          label="Target Book"
          :options="otherBooks.map((b) => ({ label: b.name, value: b.id }))"
          placeholder="Select a book"
        />

        <div
          v-if="selectedTargetBookId"
          class="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-md space-y-1"
        >
          <p class="font-semibold">Note:</p>
          <ul class="list-disc list-inside space-y-0.5 ml-1">
            <li>Categories, Payment Modes, and Products will be created in the target book if they don't exist.</li>
            <li v-if="targetAction === 'move'" class="text-red-600 dark:text-red-400 font-semibold">
              {{ isBulkTarget ? "These transactions will be" : "This transaction will be" }} DELETED from the current
              book after moving.
            </li>
          </ul>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="closeTargetBookModal">Cancel</BaseButton>
          <BaseButton
            :disabled="!selectedTargetBookId || isProcessing"
            :loading="isProcessing"
            @click="executeCopyOrMove"
          >
            {{ targetAction === "copy" ? "Copy" : "Move" }}
          </BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Duplicate Description Confirmation Modal -->
    <BaseModal
      :show="showDuplicateDescriptionModal"
      title="Duplicate Description"
      @close="showDuplicateDescriptionModal = false"
    >
      <p class="text-gray-600 dark:text-gray-300">
        Do you want to duplicate the description as well?
      </p>

      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" @click="executeDuplicate(false)">No</BaseButton>
        <BaseButton @click="executeDuplicate(true)">Yes</BaseButton>
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

    <BaseSnackbar
      :show="showSnackbar"
      :message="snackbarMessage"
      action-label="Undo"
      :revision="snackbarRevision"
      @action="undoDeletes"
      @close="onSnackbarClose"
    />

    <BaseToast :show="showToast" :message="toastMessage" :type="toastType" @close="showToast = false" />

    <AttachmentViewer
      v-model="showAttachmentViewer"
      :images="viewerImages"
      :start-index="viewerIndex"
    />
  </PageLayout>

  <!-- FAB -->
  <FloatingActionButton raised :show="!isSelecting && !showSnackbar" @click="goToCreateTransaction" />
</template>
