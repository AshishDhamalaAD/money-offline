<script setup>
import { usePageFeedback } from "@/composables/usePageFeedback"
import BaseError from "@/components/common/BaseError.vue"
import ResourceState from "@/components/common/ResourceState.vue"

import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import { formatDateTime } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/moneyUtils"
import { useProductStore } from "@/store/productStore"
import { useBookStore } from "@/store/bookStore"
import IconTrash from "@/assets/icons/IconTrash.vue"
import IconEdit from "@/assets/icons/IconEdit.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"

const { operationError, operationBusy, operationReady, operationAction, retryOperation, runOperation } = usePageFeedback()

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const bookStore = useBookStore()

const bookId = parseInt(route.params.bookId)
const productId = parseInt(route.params.productId)
const product = computed(() => productStore.products.find(item => item.id === productId))
const rates = ref([])
const book = ref(null)

const showEditModal = ref(false)
const showDeleteModal = ref(false)
const selectedRate = ref(null)
const editForm = ref({
  rate: 0,
  created_at: "",
})

onMounted(async () => {
  return runOperation(async () => {
    if (!bookId || !productId) return

    book.value = await bookStore.getBook(bookId)
    productStore.watchProducts(bookId)

    await loadRates()
  }, "Could not load rate history.", true)
})

async function loadRates() {
  rates.value = await productStore.getProductRates(productId)
}

function openEditModal(rate) {
  selectedRate.value = rate
  editForm.value.rate = rate.rate
  // Format for datetime-local input: YYYY-MM-DDTHH:mm
  const date = new Date(rate.created_at)
  const offset = date.getTimezoneOffset() * 60000
  const localISOTime = new Date(date - offset).toISOString().slice(0, 16)
  editForm.value.created_at = localISOTime

  showEditModal.value = true
}

function openDeleteModal(rate) {
  selectedRate.value = rate
  showDeleteModal.value = true
}

async function saveRate() {
  return runOperation(async () => {
    if (!selectedRate.value) return

    await productStore.updateProductRate(selectedRate.value.id, {
      rate: editForm.value.rate,
      created_at: editForm.value.created_at.replace("T", " ") + ":00", // Simple format fix, ideally use dateUtils
    })

    await loadRates()
    showEditModal.value = false
    selectedRate.value = null
  }, "Could not save rate history.", false)
}

async function deleteRate() {
  return runOperation(async () => {
    if (!selectedRate.value) return

    await productStore.deleteProductRate(selectedRate.value.id)
    await loadRates()
    showDeleteModal.value = false
    selectedRate.value = null
  }, "Could not delete rate history.", false)
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="`${product?.name || 'Product'} Rate History`" />

    <main class="p-4 space-y-4">
      <ResourceState :resources="[productStore]" />
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <div v-if="operationReady && !operationError && rates.length === 0" class="text-center text-gray-500 py-8 dark:text-gray-400">No history found.</div>

      <div v-else-if="rates.length" class="space-y-3">
        <div
          v-for="rate in rates"
          :key="rate.id"
          class="bg-white p-4 rounded-sm shadow-sm flex justify-between items-center dark:bg-gray-900 dark:border dark:border-gray-800"
        >
          <div>
            <p class="font-bold text-lg text-gray-900 dark:text-gray-100">Rs. {{ formatCurrency(rate.rate) }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatDateTime(new Date(rate.created_at)) }}</p>
          </div>

          <div class="flex gap-2">
            <button type="button" aria-label="Edit rate history"
              @click="openEditModal(rate)"
              class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <IconEdit class="w-5 h-5" />
            </button>
            <button type="button" aria-label="Delete rate history"
              @click="openDeleteModal(rate)"
              class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors dark:text-gray-300 dark:hover:bg-red-900/30"
            >
              <IconTrash class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Edit Modal -->
    <BaseModal :dismissible="!operationBusy" :show="showEditModal" title="Edit Rate History" @close="showEditModal = false">
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <div class="space-y-4">
        <BaseInput v-model="editForm.rate" type="number" label="Rate" required />
        <BaseInput v-model="editForm.created_at" type="datetime-local" label="Date" required />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" :disabled="operationBusy" @click="showEditModal = false">Cancel</BaseButton>
          <BaseButton :loading="operationBusy" @click="saveRate">Save</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Delete Modal -->
    <BaseModal :dismissible="!operationBusy" :show="showDeleteModal" title="Delete History" @close="showDeleteModal = false">
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <p class="text-gray-600 dark:text-gray-300">Are you sure you want to delete this history record?</p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" :disabled="operationBusy" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" :loading="operationBusy" @click="deleteRate">Delete</BaseButton>
      </div>
    </BaseModal>
  </PageLayout>
</template>
