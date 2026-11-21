<script setup>
import { usePageFeedback } from "@/composables/usePageFeedback"
import BaseError from "@/components/common/BaseError.vue"

import ResourceState from "@/components/common/ResourceState.vue"
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"

import { formatCurrency } from "@/utils/moneyUtils"
import { formatDateOnly, frequencyLabel } from "@/utils/recurrence"
import { useBookStore } from "@/store/bookStore"
import { useCategoryStore } from "@/store/categoryStore"
import { useRecurringStore } from "@/store/recurringStore"
import BaseButton from "@/components/common/BaseButton.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import SettingsTabs from "../components/SettingsTabs.vue"

const { operationError, operationBusy, operationReady, operationAction, retryOperation, runOperation, reportFailure } = usePageFeedback()

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const categoryStore = useCategoryStore()
const recurringStore = useRecurringStore()

const bookId = parseInt(route.params.bookId)
const book = ref(null)

onMounted(async () => {
  return runOperation(async () => {
    if (!bookId) return

    book.value = await bookStore.getBook(bookId)
    recurringStore.watchRecurring(bookId)
    categoryStore.watchCategories(bookId)
  }, "Could not load recurring transactions.", true)
})

function categoryNames(rule) {
  const ids = rule.category_ids || []
  const names = ids
    .map((id) => categoryStore.categories.find((category) => category.id === id)?.name)
    .filter(Boolean)

  return names.join(", ")
}

function ruleTitle(rule) {
  return rule.description || categoryNames(rule) || (rule.type === "in" ? "Recurring income" : "Recurring expense")
}

const sortedRules = computed(() =>
  [...recurringStore.rules].sort((a, b) => {
    if (Boolean(a.active) !== Boolean(b.active)) return a.active ? -1 : 1
    return String(a.next_due_date).localeCompare(String(b.next_due_date))
  }),
)

function navigateToAdd() {
  router.push({ name: "book-settings-recurring-new", params: { bookId } })
}

function navigateToEdit(rule) {
  router.push({ name: "book-settings-recurring-edit", params: { bookId, id: rule.id } })
}

async function toggle(rule) {
  return runOperation(async () => {
    await recurringStore.toggleRule(rule)
  }, "Could not update recurring transactions.", false)
}
</script>

<template>
  <PageLayout>
    <PageHeader
      :title="book?.name || 'Recurring'"
      :back-route="{ name: 'book-details', params: { id: bookId } }"
    />

    <main class="space-y-6 p-4">
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <ResourceState :resources="[recurringStore, categoryStore]">
      <SettingsTabs :book-id="bookId" />

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Recurring transactions</h2>
          <BaseButton size="sm" @click="navigateToAdd">Add New</BaseButton>
        </div>

        <p class="text-sm text-gray-500 dark:text-gray-400">
          Rent, salary and subscriptions. When a due date arrives, the entry opens in the transaction form so you can
          review it before saving.
        </p>

        <div class="space-y-3">
          <div
            v-for="rule in sortedRules"
            :key="rule.id"
            @click="navigateToEdit(rule)"
            class="flex items-center justify-between gap-3 rounded-sm bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:ring-gray-800 dark:hover:bg-gray-800"
          >
            <div class="min-w-0">
              <p class="truncate font-medium text-gray-900 dark:text-gray-100"><button type="button" class="rounded-sm text-left" @click.stop="navigateToEdit(rule)">{{ ruleTitle(rule) }}</button></p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ frequencyLabel(rule.frequency) }} ·
                <span v-if="rule.active">Next {{ formatDateOnly(rule.next_due_date) }}</span>
                <span v-else>Paused</span>
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500">
                {{ rule.type === "in" ? "Income" : "Expense" }}
              </p>
            </div>

            <div class="flex shrink-0 items-center gap-3">
              <span
                :class="[
                  'text-sm font-semibold',
                  rule.type === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                ]"
              >
                {{ rule.type === "in" ? "+" : "-" }}{{ formatCurrency(rule.amount) }}
              </span>
              <button
                type="button"
                :disabled="operationBusy"
                :aria-pressed="!!rule.active"
                :aria-label="`${rule.active ? 'Pause' : 'Resume'} ${ruleTitle(rule)}`"
                @click.stop="toggle(rule)"
                :class="[
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  rule.active
                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200',
                ]"
              >
                {{ rule.active ? "Pause" : "Resume" }}
              </button>
            </div>
          </div>

          <div v-if="sortedRules.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
            No recurring transactions yet.
          </div>
        </div>
      </div>
          </ResourceState>
    </main>
  </PageLayout>
</template>
