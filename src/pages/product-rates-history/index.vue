<script setup>
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

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const bookStore = useBookStore()

const bookId = parseInt(route.params.bookId)
const productId = parseInt(route.params.productId)
const product = ref(null)
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
  if (!bookId || !productId) return

  book.value = await bookStore.getBook(bookId)
  productStore.watchProducts(bookId)

  // Wait for products to load
  const unsubscribe = productStore.$subscribe((mutation, state) => {
    if (!product.value) {
      product.value = state.products.find((p) => p.id === productId)
    }
  })

  // Try immediately
  product.value = productStore.products.find((p) => p.id === productId)

  await loadRates()
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
  if (!selectedRate.value) return

  await productStore.updateProductRate(selectedRate.value.id, {
    rate: editForm.value.rate,
    created_at: editForm.value.created_at.replace("T", " ") + ":00", // Simple format fix, ideally use dateUtils
  })

  await loadRates()
  showEditModal.value = false
  selectedRate.value = null
}

async function deleteRate() {
  if (!selectedRate.value) return

  await productStore.deleteProductRate(selectedRate.value.id)
  await loadRates()
  showDeleteModal.value = false
  selectedRate.value = null
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="`${product?.name || 'Product'} Rate History`" />

    <main class="p-4 space-y-4">
      <div v-if="rates.length === 0" class="text-center text-gray-500 py-8 dark:text-gray-400">No history found.</div>

      <div v-else class="space-y-3">
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
            <button
              @click="openEditModal(rate)"
              class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <IconEdit class="w-5 h-5" />
            </button>
            <button
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
    <BaseModal :show="showEditModal" title="Edit Rate History" @close="showEditModal = false">
      <div class="space-y-4">
        <BaseInput v-model="editForm.rate" type="number" label="Rate" required />
        <BaseInput v-model="editForm.created_at" type="datetime-local" label="Date" required />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showEditModal = false">Cancel</BaseButton>
          <BaseButton @click="saveRate">Save</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Delete Modal -->
    <BaseModal :show="showDeleteModal" title="Delete History" @close="showDeleteModal = false">
      <p class="text-gray-600 dark:text-gray-300">Are you sure you want to delete this history record?</p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="deleteRate">Delete</BaseButton>
      </div>
    </BaseModal>
  </PageLayout>
</template>
