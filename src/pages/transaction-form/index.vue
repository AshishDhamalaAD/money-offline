<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from "vue"
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router"

import { db } from "@/db/dexie"
import { useTransactionStore } from "@/store/transactionStore"
import { setLastBookId } from "@/utils/lastBook"
import { useCategoryStore } from "@/store/categoryStore"
import { useContactStore } from "@/store/contactStore"
import { usePaymentModeStore } from "@/store/paymentModeStore"
import { useProductStore } from "@/store/productStore"
import { useRecurringStore } from "@/store/recurringStore"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import BaseConfirm from "@/components/common/BaseConfirm.vue"
import BaseToast from "@/components/common/BaseToast.vue"
import LightGallery from "@/components/common/LightGallery.vue"
import FixedSaveButton from "@/components/common/FixedSaveButton.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import TransactionFields from "@/pages/transaction-form/TransactionFields.vue"
import ImageUpload from "@/components/common/LazyImageUpload.vue"

const route = useRoute()
const router = useRouter()
const transactionStore = useTransactionStore()
const categoryStore = useCategoryStore()
const contactStore = useContactStore()
const paymentModeStore = usePaymentModeStore()
const productStore = useProductStore()
const recurringStore = useRecurringStore()

const bookId = parseInt(route.params.bookId)
const isEdit = !!route.params.id

// Set when the form was opened from a recurring rule that came due. Saving
// advances that rule to its next occurrence.
const recurringSource = ref(null)

// A prefilled form (duplicate or recurring review) opens its line items so
// they are visible without an extra tap.
const prefillProductCount = (() => {
  try {
    return JSON.parse(history.state?.prefill || "null")?.products?.length || 0
  } catch {
    return 0
  }
})()
const initialShowProducts = ref(isEdit || prefillProductCount > 0)

// Any entry made for a book makes it the default for quick add and the nav.
if (Number.isFinite(bookId)) {
  setLastBookId(bookId)
}

const transactionAttachments = ref([])

const form = ref({
  type: "out",
  date: (() => {
    // Use local time without timezone conversion
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")

    return `${year}-${month}-${day}T${hours}:${minutes}`
  })(),
  category_ids: [],
  contact_id: "",
  payment_mode_id: "",
  description: "",
  products: [],
  amount: 0,
  discount: 0,
  charge: 0,
})

const productImages = computed(() => {
  const images = []
  // Product attachments
  if (form.value.products) {
    form.value.products.forEach((p) => {
      if (p.product_id) {
        const product = productStore.products.find((mp) => mp.id === p.product_id)
        if (product && product.attachments) {
          images.push(...product.attachments)
        }
      }
    })
  }
  return images
})

// Lightweight feedback instead of blocking browser dialogs
const showToast = ref(false)
const toastMessage = ref("")
const toastType = ref("error")

function notify(message, type = "error") {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

// Reusable confirmation sheet
const confirmState = ref({
  show: false,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  variant: "primary",
  action: null,
})

function askConfirm({ title, message, confirmLabel = "Confirm", variant = "primary", action }) {
  confirmState.value = { show: true, title, message, confirmLabel, variant, action }
}

function runConfirmedAction() {
  const action = confirmState.value.action
  confirmState.value.show = false
  if (typeof action === "function") action()
}

function handleUpload(url) {
  transactionAttachments.value.push(url)
}

function removeAttachment(index) {
  askConfirm({
    title: "Delete image?",
    message: "This image will be removed from the transaction.",
    confirmLabel: "Delete",
    variant: "danger",
    action: () => transactionAttachments.value.splice(index, 1),
  })
}

const selectedCategories = computed(() => {
  return form.value.category_ids.map((id) => categoryStore.categories.find((c) => c.id === id)).filter(Boolean)
})

const availableCategories = computed(() => {
  return categoryStore.categories.filter((c) => !form.value.category_ids.includes(c.id))
})

function addCategory(id) {
  if (id && !form.value.category_ids.includes(id)) {
    form.value.category_ids.push(id)
  }
}

function removeCategory(id) {
  form.value.category_ids = form.value.category_ids.filter((cId) => cId !== id)
}

const saving = ref(false)
const saved = ref(false)

// Track unsaved work so a back gesture doesn't silently throw it away
const snapshot = ref("")
const allowLeave = ref(false)
const pendingNavigation = ref(null)

function serializeForm() {
  return JSON.stringify({
    form: form.value,
    attachments: transactionAttachments.value,
  })
}

const isDirty = computed(() => Boolean(snapshot.value) && serializeForm() !== snapshot.value)

onBeforeRouteLeave((to) => {
  if (allowLeave.value || saved.value || !isDirty.value) return true

  pendingNavigation.value = to.fullPath
  askConfirm({
    title: "Discard changes?",
    message: "You have unsaved changes. Leaving now will discard them.",
    confirmLabel: "Discard",
    variant: "danger",
    action: () => {
      allowLeave.value = true
      router.push(pendingNavigation.value)
    },
  })

  return false
})

function handleBeforeUnload(event) {
  if (saved.value || !isDirty.value) return
  event.preventDefault()
  event.returnValue = ""
}

onMounted(async () => {
  window.addEventListener("beforeunload", handleBeforeUnload)

  // Load categories, products, payment modes for this book
  categoryStore.watchCategories(bookId)
  paymentModeStore.watchPaymentModes(bookId)
  productStore.watchProducts(bookId)
  // Contacts are global

  if (isEdit) {
    const id = parseInt(route.params.id)
    // The list screen only keeps a page of transactions in memory, so read the
    // row straight from Dexie.
    const t = await db.transactions.get(id)
    if (t) {
      if (t.attachments && t.attachments.length > 0) {
        transactionAttachments.value = t.attachments
      }

      // Convert date from 'YYYY-MM-DD HH:mm:ss' to 'YYYY-MM-DDTHH:mm' for datetime-local input
      const dateStr = t.date
      if (dateStr) {
        // Parse the date string and convert to datetime-local format
        const dateParts = dateStr.split(" ")
        const datePart = dateParts[0] // YYYY-MM-DD
        const timePart = dateParts[1] ? dateParts[1].substring(0, 5) : "00:00" // HH:mm
        t.date = `${datePart}T${timePart}`
      }
      if (t.description) {
        t.description = t.description
          .replace(/<\/p>\s*<p>/g, "\n") // replace between paragraphs with newline
          .replace(/<\/?p>/g, "") // remove remaining <p> or </p>
      }
      form.value = { ...t }
      // Handle migration/compatibility for old transactions with single category_id
      if (t.category_id && (!t.category_ids || t.category_ids.length === 0)) {
        form.value.category_ids = [t.category_id]
      } else if (!form.value.category_ids) {
        form.value.category_ids = []
      }
    }
  } else {
    // Check if we arrived here from a Duplicate or recurring action (prefill via router state)
    const prefillRaw = history.state?.prefill
    if (prefillRaw) {
      try {
        const prefill = JSON.parse(prefillRaw)
        if (prefill.__recurring) {
          recurringSource.value = prefill.__recurring
          delete prefill.__recurring
        }
        form.value = { ...form.value, ...prefill }
        // Duplicates keep the line items; a recurring rule may have none.
        if (!recurringSource.value && (!form.value.products || form.value.products.length === 0)) {
          addProduct()
        }
      } catch (e) {
        console.error("Failed to parse prefill state", e)
        addProduct()
      }
    } else {
      // Normal new transaction: start with just an amount so it can be entered
      // in three taps, and reuse the previous entry's categories and accounts.
      await new Promise((resolve) => setTimeout(resolve, 100))
      await applyLastTransactionDefaults()
    }

    // Remember the starting state so we can warn before losing unsaved edits
    await nextTick()
    snapshot.value = serializeForm()
  }
})

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload)
})

async function applyLastTransactionDefaults() {
  let last = null

  try {
    const recent = await db.transactions.where("book_id").equals(bookId).reverse().sortBy("date")
    last = recent[0] || null
  } catch (e) {
    console.error("Failed to load last transaction defaults", e)
  }

  if (last) {
    const categoryIds = (last.category_ids || []).filter((id) => categoryStore.categories.some((c) => c.id === id))
    if (categoryIds.length > 0) {
      form.value.category_ids = categoryIds
    }

    if (last.payment_mode_id && paymentModeStore.paymentModes.some((p) => p.id === last.payment_mode_id)) {
      form.value.payment_mode_id = last.payment_mode_id
    }

    if (last.contact_id && contactStore.contacts.some((c) => c.id === last.contact_id)) {
      form.value.contact_id = last.contact_id
    }
  }

  if (!form.value.category_ids.length) {
    const foodCategory = categoryStore.categories.find((c) => c.name.toLowerCase() === "food")
    if (foodCategory) {
      form.value.category_ids = [foodCategory.id]
    }
  }

  if (!form.value.payment_mode_id) {
    const cashMode = paymentModeStore.paymentModes.find((p) => p.name.toLowerCase() === "cash")
    if (cashMode) {
      form.value.payment_mode_id = cashMode.id
    }
  }
}

function addProduct() {
  form.value.products.push({
    id: Date.now(), // temp id
    name: "",
    quantity: 1,
    rate: 0,
    amount: 0,
  })
}

async function save() {
  // Validation
  if (form.value.products.length > 0) {
    for (const p of form.value.products) {
      // If products exist in master, require selection (product_id)
      // If no products in master, require name
      if (productStore.products.length > 0) {
        if (!p.product_id) {
          notify("Please select a product for all items.")
          return
        }
      } else {
        if (!p.name || !p.name.trim()) {
          notify("Please enter a name for all items.")
          return
        }
      }
    }
  }

  saving.value = true
  try {
    if (isEdit) {
      await transactionStore.updateTransaction(parseInt(route.params.id), {
        ...form.value,
        attachments: transactionAttachments.value,
      })
    } else {
      await transactionStore.createTransaction({
        ...form.value,
        book_id: bookId,
        attachments: transactionAttachments.value,
      })

      // The entry came from a due recurring rule: move that rule forward so it
      // is not offered again for the same period.
      if (recurringSource.value) {
        await recurringStore.completeDue(recurringSource.value.ruleId, recurringSource.value.dueDate)
      }
    }
    saved.value = true
    router.back()
  } catch (e) {
    console.error(e)
    notify("Failed to save transaction")
  } finally {
    saving.value = false
  }
}

// Delete transaction
const showDeleteModal = ref(false)

async function confirmDelete() {
  showDeleteModal.value = true
}

async function deleteTransaction() {
  try {
    await transactionStore.deleteTransaction(parseInt(route.params.id))
    showDeleteModal.value = false
    saved.value = true
    router.back()
  } catch (e) {
    console.error(e)
    notify("Failed to delete transaction")
  }
}

</script>

<template>
  <PageLayout>
    <PageHeader
      :title="isEdit ? 'Edit Transaction' : 'New Transaction'"
      :back-route="{ name: 'book-details', params: { id: bookId } }"
    >
      <template #actions>
        <button
          v-if="isEdit"
          @click="confirmDelete"
          class="rounded-sm px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
        >
          Delete
        </button>
      </template>
    </PageHeader>

    <main class="p-4 space-y-6">
      <TransactionFields :book-id="bookId" :form="form" :initial-show-products="initialShowProducts">
        <template #schedule>
          <BaseInput v-model="form.date" type="datetime-local" label="Date" required />
        </template>

        <template #after-description>

      <!-- Image Upload -->
      <div class="space-y-4 rounded-sm bg-white p-4 shadow-sm dark:bg-gray-900 dark:border dark:border-gray-800">
        <div v-if="productImages.length > 0">
          <h3 class="font-medium text-gray-900 mb-2 dark:text-gray-100">Product Images</h3>
          <LightGallery :images="productImages" />
        </div>

        <div v-if="transactionAttachments.length > 0">
          <h3 class="font-medium text-gray-900 mb-2 dark:text-gray-100">Transaction Images</h3>
          <LightGallery :images="transactionAttachments" editable @delete="removeAttachment" />
        </div>

        <ImageUpload @upload="handleUpload" from="transactions" />
      </div>
        </template>
      </TransactionFields>
    </main>

    <FixedSaveButton @click="save" />

    <!-- Delete Confirmation Modal -->
    <BaseModal :show="showDeleteModal" title="Delete Transaction" @close="showDeleteModal = false">
      <div class="space-y-4">
        <p class="text-gray-600 dark:text-gray-300">
          Are you sure you want to delete this transaction? This action cannot be undone.
        </p>

        <div class="bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-900/30 dark:border-red-800">
          <p class="text-sm text-red-800 dark:text-red-200">
            <strong>Warning:</strong> This will permanently delete the transaction.
          </p>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
          <BaseButton variant="danger" @click="deleteTransaction">Delete Transaction</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Confirmation sheet (discard changes, remove image, ...) -->
    <BaseConfirm
      v-model="confirmState.show"
      :title="confirmState.title"
      :message="confirmState.message"
      :confirm-label="confirmState.confirmLabel"
      :variant="confirmState.variant"
      @confirm="runConfirmedAction"
    />

    <BaseToast :show="showToast" :message="toastMessage" :type="toastType" @close="showToast = false" />
  </PageLayout>
</template>
