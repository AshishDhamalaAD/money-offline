<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { liveQuery } from "dexie"

import { db } from "@/db/dexie"
import { useBookStore } from "@/store/bookStore"
import { formatCurrency } from "@/utils/moneyUtils"
import { getLastBookId } from "@/utils/lastBook"
import IconPlus from "@/assets/icons/IconPlus.vue"
import IconBook from "@/assets/icons/IconBook.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import FloatingActionButton from "@/components/common/FloatingActionButton.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import BookCard from "@/pages/dashboard/BookCard.vue"

const router = useRouter()
const bookStore = useBookStore()

const showCreateModal = ref(false)
const newBookName = ref("")
const creating = ref(false)

// Per-book totals, filled from a live query so balances update as soon as a
// transaction is saved or deleted.
const summaries = ref({})
const overview = ref({ balance: 0, monthIn: 0, monthOut: 0 })

let subscription = null

function dayStart(date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function buildSummaries(transactions) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = dayStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))

  const byBook = {}
  const totals = { balance: 0, monthIn: 0, monthOut: 0 }

  for (const tx of transactions) {
    const bookId = tx.book_id
    if (bookId === undefined || bookId === null) continue

    const amount = parseFloat(tx.amount) || 0
    const isIncome = tx.type === "in"

    if (!byBook[bookId]) {
      byBook[bookId] = { balance: 0, monthIn: 0, monthOut: 0, sparkline: Array(7).fill(0) }
    }

    const summary = byBook[bookId]
    summary.balance += isIncome ? amount : -amount
    totals.balance += isIncome ? amount : -amount

    const txDate = new Date(tx.date)
    if (Number.isNaN(txDate.getTime())) continue

    if (txDate >= monthStart) {
      if (isIncome) {
        summary.monthIn += amount
        totals.monthIn += amount
      } else {
        summary.monthOut += amount
        totals.monthOut += amount
      }
    }

    if (!isIncome && txDate >= weekStart) {
      const index = Math.floor((dayStart(txDate) - weekStart) / 86400000)
      if (index >= 0 && index < 7) {
        summary.sparkline[index] += amount
      }
    }
  }

  summaries.value = byBook
  overview.value = totals
}

onMounted(() => {
  subscription = liveQuery(() => db.transactions.toArray()).subscribe({
    next: buildSummaries,
    error: (error) => console.error("Failed to load dashboard totals", error),
  })
})

onUnmounted(() => {
  subscription?.unsubscribe()
})

async function handleCreateBook() {
  if (!newBookName.value.trim()) return

  creating.value = true
  try {
    await bookStore.createBook(newBookName.value)
    showCreateModal.value = false
    newBookName.value = ""
  } finally {
    creating.value = false
  }
}

// The FAB records a transaction in the book that was opened last, so a repeat
// entry never needs the book picked again.
function quickAddTransaction() {
  const lastId = getLastBookId()
  const target = bookStore.books.find((book) => book.id === lastId) || bookStore.sortedBooks[0]

  if (!target) {
    showCreateModal.value = true
    return
  }

  router.push({ name: "create-transaction", params: { bookId: target.id } })
}
</script>

<template>
  <PageLayout>
    <PageHeader title="My Books" :showBack="false">
      <template #actions>
        <button
          @click="showCreateModal = true"
          class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          aria-label="Create book"
        >
          <IconPlus />
        </button>
      </template>
    </PageHeader>

    <!-- Content -->
    <main class="space-y-4 p-4">
      <div v-if="bookStore.books.length === 0" class="mt-10 flex flex-col items-center justify-center text-center">
        <div class="mb-4 rounded-full bg-indigo-50 p-4 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-100">
          <IconBook class="h-10 w-10" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">No books yet</h3>
        <p class="mt-1 text-gray-500 dark:text-gray-400">Create your first book to start tracking expenses.</p>
        <div class="mt-6">
          <BaseButton @click="showCreateModal = true">Create Book</BaseButton>
        </div>
      </div>

      <template v-else>
        <!-- Combined balance across every book -->
        <section
          class="rounded-sm bg-indigo-600 p-5 text-white shadow-sm dark:bg-indigo-700"
          aria-label="Total balance"
        >
          <p class="text-xs font-medium uppercase tracking-wider text-indigo-100">Total balance</p>
          <p class="mt-1 text-3xl font-bold truncate">{{ formatCurrency(overview.balance) }}</p>

          <div class="mt-4 flex gap-6">
            <div>
              <p class="text-xs text-indigo-100">In this month</p>
              <p class="mt-0.5 text-sm font-semibold text-green-200">
                +{{ formatCurrency(overview.monthIn) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-indigo-100">Out this month</p>
              <p class="mt-0.5 text-sm font-semibold text-red-200">
                -{{ formatCurrency(overview.monthOut) }}
              </p>
            </div>
          </div>
        </section>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BookCard
            v-for="book in bookStore.books"
            :key="book.id"
            :book="book"
            :summary="summaries[book.id]"
          />
        </div>
      </template>
    </main>

    <!-- FAB (Floating Action Button) -->
    <FloatingActionButton
      :show="bookStore.sortedBooks.length > 0"
      raised
      @click="quickAddTransaction"
    />

    <!-- Create Book Modal -->
    <BaseModal :show="showCreateModal" title="Create New Book" @close="showCreateModal = false">
      <div class="space-y-4">
        <BaseInput v-model="newBookName" label="Book Name" placeholder="e.g. Personal Expenses" autoFocus />
        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showCreateModal = false">Cancel</BaseButton>
          <BaseButton :loading="creating" @click="handleCreateBook">Create</BaseButton>
        </div>
      </div>
    </BaseModal>
  </PageLayout>
</template>
