<script setup>
import { usePageFeedback } from "@/composables/usePageFeedback"
import BaseError from "@/components/common/BaseError.vue"

import ResourceState from "@/components/common/ResourceState.vue"
import { ref, computed, onMounted, onUnmounted, reactive } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useLiveResource } from "@/composables/useLiveResource"

import { db } from "@/db/dexie"
import { formatCurrency } from "@/utils/moneyUtils"
import { useBookStore } from "@/store/bookStore"
import { useBudgetStore } from "@/store/budgetStore"
import { useCategoryStore } from "@/store/categoryStore"
import BaseButton from "@/components/common/BaseButton.vue"
import BudgetRing from "@/components/common/BudgetRing.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import SettingsTabs from "../components/SettingsTabs.vue"

const { operationError, operationBusy, operationReady, operationAction, retryOperation, runOperation, reportFailure } = usePageFeedback()

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const budgetStore = useBudgetStore()
const categoryStore = useCategoryStore()

const bookId = parseInt(route.params.bookId)
const book = ref(null)
const spendState = reactive(useLiveResource({}, 'Could not load budget spending.'))
const monthSpent = computed(() => spendState.data)

onMounted(async () => {
  return runOperation(async () => {
    if (!bookId) return

    book.value = await bookStore.getBook(bookId)
    budgetStore.watchBudgets(bookId)
    categoryStore.watchCategories(bookId)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    spendState.start(async () => {
      const transactions = await db.transactions.where('book_id').equals(bookId).toArray()
      const spent = {}
      for (const tx of transactions) {
        if (tx.type !== 'out') continue
        const date = new Date(tx.date)
        if (Number.isNaN(date.getTime()) || date < monthStart) continue
        const amount = parseFloat(tx.amount) || 0
        for (const categoryId of tx.category_ids || []) spent[categoryId] = (spent[categoryId] || 0) + amount
      }
      return spent
    }, bookId)
  }, "Could not load budgets.", true)
})

const rows = computed(() =>
  budgetStore.budgets
    .map((budget) => {
      const category = categoryStore.categories.find((item) => item.id === budget.category_id)
      const spent = monthSpent.value[budget.category_id] || 0
      const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

      return {
        ...budget,
        name: category?.name || "Uncategorised",
        spent,
        percent,
      }
    })
    .sort((a, b) => b.percent - a.percent),
)

function navigateToAdd() {
  router.push({ name: "book-settings-budgets-new", params: { bookId } })
}

function navigateToEdit(budget) {
  router.push({ name: "book-settings-budgets-edit", params: { bookId, id: budget.id } })
}
</script>

<template>
  <PageLayout>
    <PageHeader
      :title="book?.name || 'Budgets'"
      :back-route="{ name: 'book-details', params: { id: bookId } }"
    />

    <main class="space-y-6 p-4">
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <ResourceState :resources="[budgetStore, categoryStore, spendState]">
      <SettingsTabs :book-id="bookId" />

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Monthly budgets</h2>
          <BaseButton size="sm" @click="navigateToAdd">Add New</BaseButton>
        </div>

        <p class="text-sm text-gray-500 dark:text-gray-400">
          Set a monthly limit per category. Progress appears on the home screen and turns amber at 80%, red at 100%.
        </p>

        <div class="space-y-3">
          <div
            v-for="row in rows"
            :key="row.id"
            @click="navigateToEdit(row)"
            role="button"
            tabindex="0"
            @keydown.enter.self.prevent="navigateToEdit(row)"
            @keydown.space.self.prevent="navigateToEdit(row)"
            class="flex items-center gap-4 rounded-sm bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:ring-gray-800 dark:hover:bg-gray-800"
          >
            <BudgetRing :percent="row.percent" :size="52" />

            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate font-medium text-gray-900 dark:text-gray-100">{{ row.name }}</p>
                <p class="shrink-0 text-sm text-gray-600 dark:text-gray-300">
                  {{ formatCurrency(row.spent) }} / {{ formatCurrency(row.amount) }}
                </p>
              </div>

              <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  :class="[
                    'h-full rounded-full transition-all',
                    row.percent >= 100 ? 'bg-red-500' : row.percent >= 80 ? 'bg-amber-500' : 'bg-indigo-500',
                  ]"
                  :style="{ width: `${Math.min(row.percent, 100)}%` }"
                ></div>
              </div>

              <p
                v-if="row.percent >= 100"
                class="mt-1 text-xs font-medium text-red-600 dark:text-red-400"
              >
                Over budget
              </p>
              <p
                v-else-if="row.percent >= 80"
                class="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400"
              >
                {{ Math.round(row.percent) }}% of budget used
              </p>
              <p v-else class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {{ formatCurrency(Math.max(row.amount - row.spent, 0)) }} left this month
              </p>
            </div>
          </div>

          <div v-if="rows.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
            No budgets yet.
          </div>
        </div>
      </div>
          </ResourceState>
    </main>
  </PageLayout>
</template>
