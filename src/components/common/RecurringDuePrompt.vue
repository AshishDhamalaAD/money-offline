<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { liveQuery } from "dexie"

import { db } from "@/db/dexie"
import { useBookStore } from "@/store/bookStore"
import { formatCurrency } from "@/utils/moneyUtils"
import { collectDueDates, formatDateOnly, frequencyLabel, todayDateOnly } from "@/utils/recurrence"
import BaseBottomSheet from "@/components/common/BaseBottomSheet.vue"
import BaseButton from "@/components/common/BaseButton.vue"

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()

const dueRules = ref([])
const isOpen = ref(false)
const dismissed = ref(false)

let subscription = null

function openIfDue() {
  if (dismissed.value) return
  // The prefilled transaction form is already the review step.
  if (route.name === "create-transaction") return
  if (dueRules.value.length > 0) isOpen.value = true
}

onMounted(() => {
  const today = todayDateOnly()

  subscription = liveQuery(() =>
    db.recurring_transactions
      .filter((rule) => Boolean(rule.active) && rule.next_due_date && rule.next_due_date <= today)
      .toArray(),
  ).subscribe({
    next: (rules) => {
      dueRules.value = rules
      openIfDue()
    },
    error: (error) => console.error("Failed to load recurring transactions", error),
  })
})

onUnmounted(() => subscription?.unsubscribe())

// Re-open after returning from the review form while periods are still due.
watch(
  () => route.fullPath,
  () => openIfDue(),
)

function dismiss() {
  dismissed.value = true
  isOpen.value = false
}

const rows = computed(() =>
  dueRules.value.map((rule) => {
    const dates = collectDueDates(rule.next_due_date, rule.frequency).dates

    return {
      rule,
      count: dates.length,
      dueDate: dates[0] || rule.next_due_date,
      lastDate: dates[dates.length - 1] || rule.next_due_date,
      bookName: bookStore.books.find((book) => book.id === rule.book_id)?.name || "",
      productNames: (rule.products || []).map((product) => product.name?.trim()).filter(Boolean).join(", "),
    }
  }),
)

function review(row) {
  const rule = row.rule
  const prefill = {
    type: rule.type || "out",
    date: `${row.dueDate}T09:00`,
    amount: rule.amount || 0,
    category_ids: rule.category_ids || [],
    contact_id: rule.contact_id || "",
    payment_mode_id: rule.payment_mode_id || "",
    description: rule.description || "",
    products: rule.products || [],
    discount: rule.discount || 0,
    charge: rule.charge || 0,
    __recurring: { ruleId: rule.id, dueDate: row.dueDate },
  }

  isOpen.value = false
  router.push({
    name: "create-transaction",
    params: { bookId: rule.book_id },
    state: { prefill: JSON.stringify(prefill) },
  })
}
</script>

<template>
  <BaseBottomSheet v-model="isOpen" title="Recurring transactions" @close="dismiss">
    <div class="space-y-4 pb-2">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        These repeat on a schedule and are due. Open one to review it in the transaction form before saving.
      </p>

      <div class="space-y-2">
        <div
          v-for="row in rows"
          :key="row.rule.id"
          class="flex items-center justify-between gap-3 rounded-sm bg-gray-50 p-3 dark:bg-gray-800"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ row.rule.description || (row.rule.type === "in" ? "Recurring income" : "Recurring expense") }}
            </p>
            <p v-if="row.productNames" class="break-words text-sm text-gray-700 dark:text-gray-200">
              {{ row.productNames }}
            </p>
            <p class="truncate text-xs text-gray-500 dark:text-gray-400">
              {{ row.bookName }} · {{ frequencyLabel(row.rule.frequency) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Due {{ formatDateOnly(row.dueDate) }}
              <span v-if="row.count > 1"> · {{ row.count }} missed (to {{ formatDateOnly(row.lastDate) }})</span>
            </p>
          </div>

          <div class="flex shrink-0 flex-col items-end gap-2">
            <span
              :class="[
                'text-sm font-semibold',
                row.rule.type === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
              ]"
            >
              {{ row.rule.type === "in" ? "+" : "-" }}{{ formatCurrency(row.rule.amount) }}
            </span>
            <BaseButton size="sm" @click="review(row)">Review</BaseButton>
          </div>
        </div>
      </div>

      <BaseButton variant="secondary" block @click="dismiss">Later</BaseButton>
    </div>
  </BaseBottomSheet>
</template>
