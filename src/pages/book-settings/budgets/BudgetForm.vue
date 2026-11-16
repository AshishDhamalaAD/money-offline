<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"

import { db } from "@/db/dexie"
import { roundAmount } from "@/utils/dateUtils"
import { useBudgetStore } from "@/store/budgetStore"
import { useCategoryStore } from "@/store/categoryStore"
import IconTrash from "@/assets/icons/IconTrash.vue"
import BaseConfirm from "@/components/common/BaseConfirm.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseSearchableSelect from "@/components/common/BaseSearchableSelect.vue"
import BaseToast from "@/components/common/BaseToast.vue"
import FixedSaveButton from "@/components/common/FixedSaveButton.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"

const route = useRoute()
const router = useRouter()
const budgetStore = useBudgetStore()
const categoryStore = useCategoryStore()

const bookId = parseInt(route.params.bookId)
const itemId = route.params.id ? parseInt(route.params.id) : null
const isNew = !itemId

const form = ref({
  category_id: "",
  amount: 0,
})

const showDelete = ref(false)
const showToast = ref(false)
const toastMessage = ref("")

const title = computed(() => (isNew ? "New Budget" : "Edit Budget"))

onMounted(async () => {
  budgetStore.watchBudgets(bookId)
  categoryStore.watchCategories(bookId)

  if (!isNew) {
    const budget = await db.budgets.get(itemId)
    if (budget) {
      form.value = {
        category_id: budget.category_id,
        amount: budget.amount || 0,
      }
    }
  }
})

// A category can only have one budget, so hide categories that already have one.
const categoryOptions = computed(() => {
  const used = new Set(
    budgetStore.budgets.filter((budget) => budget.id !== itemId).map((budget) => budget.category_id),
  )

  return categoryStore.categories
    .filter((category) => !used.has(category.id))
    .map((category) => ({ label: category.name, value: category.id, description: category.description }))
})

async function save() {
  if (!form.value.category_id) {
    toastMessage.value = "Choose a category for this budget."
    showToast.value = true
    return
  }

  if (!(parseFloat(form.value.amount) > 0)) {
    toastMessage.value = "Enter a monthly limit greater than zero."
    showToast.value = true
    return
  }

  try {
    const amount = roundAmount(form.value.amount)

    if (isNew) {
      await budgetStore.addBudget(form.value.category_id, amount, bookId)
    } else {
      await budgetStore.updateBudget(itemId, { category_id: form.value.category_id, amount })
    }

    goBack()
  } catch (error) {
    console.error(error)
    toastMessage.value = "Failed to save budget."
    showToast.value = true
  }
}

async function handleDelete() {
  try {
    await budgetStore.deleteBudget(itemId)
    showDelete.value = false
    goBack()
  } catch (error) {
    console.error(error)
    toastMessage.value = "Failed to delete budget."
    showToast.value = true
    showDelete.value = false
  }
}

function goBack() {
  router.push({ name: "book-settings-budgets", params: { bookId } })
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="title" :back-route="{ name: 'book-settings-budgets', params: { bookId } }">
      <template #actions>
        <button
          v-if="!isNew"
          @click="showDelete = true"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
          aria-label="Delete budget"
        >
          <IconTrash class="h-5 w-5" />
        </button>
      </template>
    </PageHeader>

    <main class="space-y-6 p-4">
      <div class="space-y-4 rounded-sm bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900">
        <BaseSearchableSelect
          v-model="form.category_id"
          label="Category"
          :options="categoryOptions"
          placeholder="Select Category"
          required
        />

        <BaseInput
          v-model.number="form.amount"
          type="number"
          step="0.01"
          inputmode="decimal"
          enterkeyhint="done"
          label="Monthly limit"
          placeholder="0.00"
          required
        />

        <p class="ml-1 text-xs text-gray-500 dark:text-gray-400">
          Spending in this category resets on the first of each month.
        </p>
      </div>
    </main>

    <FixedSaveButton @click="save" />

    <BaseConfirm
      v-model="showDelete"
      title="Delete budget?"
      message="The category will stop showing budget progress. Transactions are not affected."
      confirm-label="Delete"
      variant="danger"
      @confirm="handleDelete"
    />

    <BaseToast :show="showToast" :message="toastMessage" type="error" @close="showToast = false" />
  </PageLayout>
</template>
