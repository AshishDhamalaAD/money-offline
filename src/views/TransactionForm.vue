<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactionStore } from '../stores/transactionStore'
import { useMasterStore } from '../stores/masterStore'
import { QUANTITY_TYPES } from '../constants'
import { db } from '../db'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import ProductLineItem from '../components/ProductLineItem.vue'
import Modal from '../components/ui/Modal.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import PageHeader from '../components/layout/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const transactionStore = useTransactionStore()
const masterStore = useMasterStore()

const bookId = parseInt(route.params.bookId)
const isEdit = !!route.params.id

const form = ref({
  type: 'out',
  date: (() => {
    // Get current time in Nepal (UTC+5:45)
    const now = new Date()
    const nepalTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }))
    
    const year = nepalTime.getFullYear()
    const month = String(nepalTime.getMonth() + 1).padStart(2, '0')
    const day = String(nepalTime.getDate()).padStart(2, '0')
    const hours = String(nepalTime.getHours()).padStart(2, '0')
    const minutes = String(nepalTime.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  })(),
  category_id: '',
  contact_id: '',
  payment_mode_id: '',
  description: '',
  products: [],
  amount: 0,
  discount: 0,
  charge: 0
})

const saving = ref(false)

onMounted(async () => {
  await masterStore.initDefaults()
  masterStore.watchBookData(bookId) // Load categories, products, payment modes for this book
  
  if (isEdit) {
    const id = parseInt(route.params.id)
    const transaction = await transactionStore.transactions.find(t => t.id === id) // Since we have them in store usually
    // Or fetch from DB if not in store (store only has current book's transactions)
    // Better to fetch from DB to be safe
    const t = await db.transactions.get(id)
    if (t) {
      form.value = { ...t }
    }
  } else {
    // Auto-add one product item for new transactions
    addProduct()
  }
})

function addProduct() {
  form.value.products.push({
    id: Date.now(), // temp id
    name: '',
    quantity: 1,
    rate: 0,
    amount: 0
  })
}

function removeProduct(index) {
  form.value.products.splice(index, 1)
  calculateTotal()
}

function updateProduct(index, item) {
  form.value.products[index] = item
  calculateTotal()
}

function calculateTotal() {
  const productsTotal = form.value.products.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  
  if (form.value.type === 'out') {
    const discount = parseFloat(form.value.discount) || 0
    const charge = parseFloat(form.value.charge) || 0
    form.value.amount = Math.max(0, productsTotal - discount + charge)
  } else {
    form.value.amount = productsTotal
  }
}

// Watch for type change to reset/recalc
watch(() => form.value.type, (newType) => {
  if (newType === 'in') {
    form.value.discount = 0
    form.value.charge = 0
  }
  calculateTotal()
})

async function save() {
  // Validation
  if (form.value.products.length > 0) {
    for (const p of form.value.products) {
      // If products exist in master, require selection (productId)
      // If no products in master, require name
      if (masterStore.products.length > 0) {
        if (!p.productId) {
          alert('Please select a product for all items.')
          return
        }
      } else {
        if (!p.name || !p.name.trim()) {
          alert('Please enter a name for all items.')
          return
        }
      }
    }
  }

  saving.value = true
  try {
    if (isEdit) {
      await transactionStore.updateTransaction(parseInt(route.params.id), form.value)
    } else {
      await transactionStore.createTransaction({
        ...form.value,
        book_id: bookId
      })
    }
    router.back()
  } catch (e) {
    console.error(e)
    alert('Failed to save transaction')
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
    router.back()
  } catch (e) {
    console.error(e)
    alert('Failed to delete transaction')
  }
}

// Quick Add Category
const showCategoryModal = ref(false)
const newCategoryName = ref('')
const newCategoryDescription = ref('')

async function saveNewCategory() {
  if (!newCategoryName.value.trim()) return
  
  try {
    // Pass bookId to addCategory
    const id = await masterStore.addCategory(newCategoryName.value, newCategoryDescription.value, bookId)
    form.value.category_id = id
    showCategoryModal.value = false
    newCategoryName.value = ''
    newCategoryDescription.value = ''
  } catch (e) {
    console.error(e)
    alert('Failed to add category')
  }
}

// Quick Add Payment Mode
const showPaymentModeModal = ref(false)
const newPaymentModeName = ref('')
const newPaymentModeDescription = ref('')

async function saveNewPaymentMode() {
  if (!newPaymentModeName.value.trim()) return
  
  try {
    const id = await masterStore.addPaymentMode(newPaymentModeName.value, newPaymentModeDescription.value, bookId)
    form.value.payment_mode_id = id
    showPaymentModeModal.value = false
    newPaymentModeName.value = ''
    newPaymentModeDescription.value = ''
  } catch (e) {
    console.error(e)
    alert('Failed to add payment mode')
  }
}

// Quick Add Product
const showProductModal = ref(false)
const newProductName = ref('')
const newProductDescription = ref('')
const newProductRate = ref(0)
const newProductQuantityType = ref('')

async function saveNewProduct() {
  if (!newProductName.value.trim()) return

  try {
    const id = await masterStore.addProduct(
      newProductName.value, 
      newProductRate.value, 
      newProductDescription.value, 
      newProductQuantityType.value, 
      bookId
    )
    showProductModal.value = false
    newProductName.value = ''
    newProductDescription.value = ''
    newProductRate.value = 0
    newProductQuantityType.value = ''
    
    // Auto-add the newly created product to the items list
    form.value.products.push({
      id: Date.now(),
      productId: id,
      name: newProductName.value,
      quantity: 1,
      rate: newProductRate.value,
      amount: newProductRate.value
    })
    calculateTotal()
  } catch (e) {
    console.error(e)
    alert('Failed to add product')
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
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
        <BaseButton size="sm" :loading="saving" @click="save">Save</BaseButton>
      </template>
    </PageHeader>

    <main class="p-4 space-y-6">
      <!-- Type Selection -->
      <div class="flex rounded-xl bg-gray-200 p-1">
        <button 
          @click="form.type = 'in'"
          :class="['flex-1 rounded-lg py-2 text-sm font-medium transition-all', form.type === 'in' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600']"
        >
          Cash In (+)
        </button>
        <button 
          @click="form.type = 'out'"
          :class="['flex-1 rounded-lg py-2 text-sm font-medium transition-all', form.type === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600']"
        >
          Cash Out (-)
        </button>
      </div>

      <!-- Basic Fields -->
      <div class="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <BaseInput 
          v-model="form.date" 
          type="datetime-local" 
          label="Date" 
          required
        />
        <BaseInput 
          v-model="form.description" 
          label="Description" 
          placeholder="What is this for?" 
        />
      </div>

      <!-- Details -->
      <div class="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <h3 class="font-medium text-gray-900">Details</h3>
        
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <SearchableSelect 
              v-model="form.category_id" 
              label="Category"
              :options="masterStore.categories.map(c => ({ label: c.name, value: c.id }))"
              placeholder="Select Category"
              required
            />
          </div>
          <button 
            @click="showCategoryModal = true"
            class="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <!-- Payment Mode -->
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <SearchableSelect 
              v-model="form.payment_mode_id" 
              label="Payment Mode"
              :options="masterStore.paymentModes.map(p => ({ label: p.name, value: p.id }))"
              placeholder="Select Payment Mode"
              required
            />
          </div>
          <button 
            @click="showPaymentModeModal = true"
            class="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <SearchableSelect 
          v-model="form.contact_id" 
          label="Contact"
          :options="masterStore.contacts.map(c => ({ label: c.name, value: c.id }))"
          placeholder="Select Contact"
        />
      </div>

      <!-- Products -->
      <div class="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <h3 class="font-medium text-gray-900">Products</h3>
          <div class="flex gap-2">
            <button 
              @click="showProductModal = true"
              class="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        
        <div class="divide-y divide-gray-100">
          <ProductLineItem 
            v-for="(p, index) in form.products" 
            :key="p.id"
            :model-value="p"
            :products="masterStore.products"
            :product-index="index"
            @update:model-value="updateProduct(index, $event)"
            @remove="removeProduct(index)"
          />
          <div v-if="form.products.length === 0" class="text-center text-gray-500 py-4 text-sm">
            No items added.
          </div>
          <div class="pt-2 text-center">
              <button @click="addProduct" class="w-full text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  + Add Item
              </button>
          </div>
        </div>
      </div>

      <!-- Discount & Charge (Cash Out Only) -->
      <div v-if="form.type === 'out'" class="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <div class="grid grid-cols-2 gap-4">
          <BaseInput 
            v-model="form.discount" 
            type="number" 
            label="Discount" 
            placeholder="0.00" 
            @input="calculateTotal"
          />
          <BaseInput 
            v-model="form.charge" 
            type="number" 
            label="Charge" 
            placeholder="0.00" 
            @input="calculateTotal"
          />
        </div>
      </div>

      <!-- Total Amount (Moved to bottom) -->
      <div class="sticky bottom-0 bg-gray-50 pt-4 pb-6 z-20">
        <div class="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-gray-200">
          <BaseInput 
            v-model="form.amount" 
            type="number" 
            label="Total Amount" 
            class="text-3xl font-bold text-indigo-600"
            disabled
            required
          />
        </div>
      </div>
    </main>

    <!-- Add Category Modal -->
    <Modal :show="showCategoryModal" title="Add New Category" @close="showCategoryModal = false">
      <div class="space-y-4">
        <BaseInput 
          v-model="newCategoryName" 
          label="Category Name" 
          placeholder="e.g. Groceries" 
          autoFocus
        />
        
        <BaseInput 
          v-model="newCategoryDescription" 
          label="Description" 
          placeholder="Optional" 
        />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showCategoryModal = false">Cancel</BaseButton>
          <BaseButton @click="saveNewCategory">Add Category</BaseButton>
        </div>
      </div>
    </Modal>

    <!-- Add Product Modal -->
    <Modal :show="showProductModal" title="Add New Product" @close="showProductModal = false">
      <div class="space-y-4 max-h-[70vh] overflow-y-auto">
        <BaseInput 
          v-model="newProductName" 
          label="Product Name" 
          placeholder="e.g. Milk" 
          required
          autoFocus
        />
        
        <BaseInput 
          v-model="newProductRate" 
          type="number" 
          label="Rate" 
          required
        />
        
        <SearchableSelect
          v-model="newProductQuantityType"
          :options="QUANTITY_TYPES"
          label="Quantity Type"
          placeholder="Select quantity type"
          required
        />

        <BaseInput 
          v-model="newProductDescription" 
          label="Description" 
          placeholder="Optional" 
        />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showProductModal = false">Cancel</BaseButton>
          <BaseButton @click="saveNewProduct">Add Product</BaseButton>
        </div>
      </div>
    </Modal>
    
    <!-- Add Payment Mode Modal -->
    <Modal :show="showPaymentModeModal" title="Add New Payment Mode" @close="showPaymentModeModal = false">
      <div class="space-y-4">
        <BaseInput 
          v-model="newPaymentModeName" 
          label="Payment Mode Name" 
          placeholder="e.g. Cash, Bank Transfer" 
          required
          autoFocus
        />
        
        <BaseInput 
          v-model="newPaymentModeDescription" 
          label="Description" 
          placeholder="Optional" 
        />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showPaymentModeModal = false">Cancel</BaseButton>
          <BaseButton @click="saveNewPaymentMode">Add Payment Mode</BaseButton>
        </div>
      </div>
    </Modal>
    
    <!-- Delete Confirmation Modal -->
    <Modal :show="showDeleteModal" title="Delete Transaction" @close="showDeleteModal = false">
      <div class="space-y-4">
        <p class="text-gray-600">
          Are you sure you want to delete this transaction? This action cannot be undone.
        </p>
        
        <div class="bg-red-50 border border-red-200 rounded-lg p-3">
          <p class="text-sm text-red-800">
            <strong>Warning:</strong> This will permanently delete the transaction.
          </p>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
          <BaseButton variant="danger" @click="deleteTransaction">Delete Transaction</BaseButton>
        </div>
      </div>
    </Modal>
  </PageLayout>
</template>
