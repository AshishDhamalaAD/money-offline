<script setup>
import { usePageFeedback } from "@/composables/usePageFeedback"
import BaseError from "@/components/common/BaseError.vue"
import ResourceState from "@/components/common/ResourceState.vue"

import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import { db } from "@/db/dexie"
import { roundAmount } from "@/utils/dateUtils"
import { FREQUENCIES, firstDueDate, todayDateOnly } from "@/utils/recurrence"
import { useCategoryStore } from "@/store/categoryStore"
import { usePaymentModeStore } from "@/store/paymentModeStore"
import { useProductStore } from "@/store/productStore"
import { useRecurringStore } from "@/store/recurringStore"
import IconTrash from "@/assets/icons/IconTrash.vue"
import BaseConfirm from "@/components/common/BaseConfirm.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseSearchableSelect from "@/components/common/BaseSearchableSelect.vue"
import BaseToast from "@/components/common/BaseToast.vue"
import FixedSaveButton from "@/components/common/FixedSaveButton.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import TransactionFields from "@/pages/transaction-form/TransactionFields.vue"

const { operationError, operationBusy, operationReady, operationAction, retryOperation, runOperation } = usePageFeedback()

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()
const paymentModeStore = usePaymentModeStore()
const productStore = useProductStore()
const recurringStore = useRecurringStore()

const bookId = parseInt(route.params.bookId)
const itemId = route.params.id ? parseInt(route.params.id) : null
const isNew = !itemId

// Same shape as the transaction form so the same fields component can edit it.
const form = ref({
  type: "out",
  amount: 0,
  description: "",
  category_ids: [],
  contact_id: "",
  payment_mode_id: "",
  products: [],
  discount: 0,
  charge: 0,
  frequency: "monthly",
  start_date: todayDateOnly(),
})

const originalStartDate = ref("")
const originalFrequency = ref("")
const saving = ref(false)
const showDelete = ref(false)
const showToast = ref(false)
const toastMessage = ref("")

const title = computed(() => (isNew ? "New Recurring Transaction" : "Edit Recurring Transaction"))

const frequencyOptions = FREQUENCIES.map((frequency) => ({ label: frequency.label, value: frequency.value }))

onMounted(async () => {
  return runOperation(async () => {
    categoryStore.watchCategories(bookId)
    paymentModeStore.watchPaymentModes(bookId)
    productStore.watchProducts(bookId)

    if (!isNew) {
      const rule = await db.recurring_transactions.get(itemId)
      if (!rule) throw new Error('This recurring transaction is no longer available')
      if (rule) {
        form.value = {
          type: rule.type || "out",
          amount: rule.amount || 0,
          description: rule.description || "",
          category_ids: [...(rule.category_ids || [])],
          contact_id: rule.contact_id || "",
          payment_mode_id: rule.payment_mode_id || "",
          products: [...(rule.products || [])],
          discount: rule.discount || 0,
          charge: rule.charge || 0,
          frequency: rule.frequency || "monthly",
          start_date: rule.start_date || todayDateOnly(),
        }
        originalStartDate.value = form.value.start_date
        originalFrequency.value = form.value.frequency
      }
    }
  }, "Could not load recurring transaction.", true)
})

function notify(message) {
  toastMessage.value = message
  showToast.value = true
}

async function save() {
  return runOperation(async () => {
    if (saving.value) return

    if (form.value.products.length > 0) {
      for (const product of form.value.products) {
        if (productStore.products.length > 0) {
          if (!product.product_id) {
            notify("Please select a product for all items.")
            return
          }
        } else if (!product.name || !product.name.trim()) {
          notify("Please enter a name for all items.")
          return
        }
      }
    } else if (!(parseFloat(form.value.amount) > 0)) {
      notify("Enter an amount greater than zero.")
      return
    }

    saving.value = true
    try {
      const startDate = form.value.start_date || todayDateOnly()
      const payload = {
        type: form.value.type,
        amount: roundAmount(form.value.amount),
        description: form.value.description.trim(),
        category_ids: form.value.category_ids || [],
        contact_id: form.value.contact_id || "",
        payment_mode_id: form.value.payment_mode_id || null,
        products: form.value.products || [],
        discount: roundAmount(form.value.discount || 0),
        charge: roundAmount(form.value.charge || 0),
        frequency: form.value.frequency,
        start_date: startDate,
      }

      if (isNew) {
        await recurringStore.addRule({ ...payload, next_due_date: firstDueDate(startDate, form.value.frequency) }, bookId)
      } else {
        const updates = { ...payload }
        // Changing the schedule restarts the rule from the chosen date.
        if (startDate !== originalStartDate.value || form.value.frequency !== originalFrequency.value) {
          updates.next_due_date = firstDueDate(startDate, form.value.frequency)
        }
        await recurringStore.updateRule(itemId, updates)
      }

      goBack()
    } catch (error) { throw error } finally {
      saving.value = false
    }
  }, "Could not save recurring transaction.", false)
}

async function handleDelete() {
  return runOperation(async () => {
    await recurringStore.deleteRule(itemId)
    showDelete.value = false
    goBack()
  }, "Could not delete recurring transaction.", false)
}

function goBack() {
  router.push({ name: "book-settings-recurring", params: { bookId } })
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="title" :back-route="{ name: 'book-settings-recurring', params: { bookId } }">
      <template #actions>
        <button
          v-if="!isNew"
          @click="showDelete = true"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
          aria-label="Delete recurring transaction"
        >
          <IconTrash class="h-5 w-5" />
        </button>
      </template>
    </PageHeader>

    <main class="space-y-6 p-4">
      <ResourceState :resources="[categoryStore, paymentModeStore, productStore]" />
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <TransactionFields :book-id="bookId" :form="form" :initial-show-products="!isNew">
        <template #schedule>
          <BaseSearchableSelect
            v-model="form.frequency"
            label="Repeats"
            :options="frequencyOptions"
            placeholder="Select frequency"
            required
          />

          <div>
            <BaseInput v-model="form.start_date" type="date" label="Start date" required />
            <p class="mt-1 ml-1 text-xs text-gray-500 dark:text-gray-400">
              Start of month and end of month snap to the 1st or last day. When a date arrives, the entry opens in the
              transaction form so you can review it before saving.
            </p>
          </div>
        </template>
      </TransactionFields>
    </main>

    <FixedSaveButton :disabled="!operationReady || !categoryStore.ready || !!categoryStore.error || !paymentModeStore.ready || !!paymentModeStore.error || !productStore.ready || !!productStore.error" :loading="operationBusy" @click="save" />

    <BaseConfirm :loading="operationBusy"
      v-model="showDelete"
      title="Delete recurring transaction?"
      message="Future entries for this schedule will stop. Transactions already added are kept."
      confirm-label="Delete"
      variant="danger"
      @confirm="handleDelete"
    >
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
    </BaseConfirm>

    <BaseToast :show="showToast" :message="toastMessage" type="error" @close="showToast = false" />
  </PageLayout>
</template>
