<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMasterStore } from '../stores/masterStore'
import { useBookStore } from '../stores/bookStore'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import Modal from '../components/ui/Modal.vue'

const router = useRouter()
const masterStore = useMasterStore()
const bookStore = useBookStore()

const activeTab = ref('categories')
const showModal = ref(false)
const editingItem = ref(null)

// Form fields
const newItemName = ref('')
const newItemDescription = ref('')
const newItemType = ref('') // for contacts/payment modes
const newItemRate = ref(0) // for products
const selectedBookId = ref(null)

onMounted(async () => {
  // Load books for category selection
  if (bookStore.books.length === 0) {
    // Trigger a load if needed, though liveQuery usually handles it. 
    // But bookStore doesn't expose a load function, it relies on liveQuery.
    // We can just wait a tick or assume they are loaded.
  }
  // Default to first book if available
  if (bookStore.books.length > 0) {
    selectedBookId.value = bookStore.books[0].id
  }
})

watch(selectedBookId, (newId) => {
  if (newId) {
    masterStore.watchCategories(newId)
  }
}, { immediate: true })

function openAddModal() {
  editingItem.value = null
  newItemName.value = ''
  newItemDescription.value = ''
  newItemType.value = ''
  newItemRate.value = 0
  showModal.value = true
}

function openEditModal(item) {
  editingItem.value = item
  newItemName.value = item.name
  newItemDescription.value = item.description || ''
  newItemType.value = item.type || ''
  newItemRate.value = item.rate || 0
  showModal.value = true
}

async function saveItem() {
  if (!newItemName.value) return

  if (activeTab.value === 'categories') {
    if (!selectedBookId.value) {
      alert('Please select a book first')
      return
    }
    // Categories: Name, Description, BookID
    // No edit for categories requested yet, but good to have. 
    // User said "add ability to edit he product", didn't explicitly say edit category but implied generally.
    // Let's support add for now as per store.
    await masterStore.addCategory(newItemName.value, newItemDescription.value, selectedBookId.value)
  } else if (activeTab.value === 'contacts') {
    await masterStore.addContact(newItemName.value, newItemType.value) // reusing type as phone
  } else if (activeTab.value === 'paymentModes') {
    await masterStore.addPaymentMode(newItemName.value, newItemType.value || 'cash')
  } else if (activeTab.value === 'products') {
    if (editingItem.value) {
      await masterStore.updateProduct(editingItem.value.id, {
        name: newItemName.value,
        rate: newItemRate.value,
        description: newItemDescription.value
      })
    } else {
      await masterStore.addProduct(newItemName.value, newItemRate.value, newItemDescription.value)
    }
  }
  
  showModal.value = false
}

async function deleteItem(id) {
  if (!confirm('Are you sure?')) return
  
  if (activeTab.value === 'categories') await masterStore.deleteCategory(id)
  else if (activeTab.value === 'contacts') await masterStore.deleteContact(id)
  else if (activeTab.value === 'paymentModes') await masterStore.deletePaymentMode(id)
  else if (activeTab.value === 'products') await masterStore.deleteProduct(id)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <header class="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
      <button @click="router.back()" class="rounded-full p-1 text-gray-600 hover:bg-gray-100">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-xl font-bold text-gray-900">Settings</h1>
    </header>

    <main class="p-4 space-y-6">
      <!-- Tabs -->
      <div class="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
        <button 
          v-for="tab in ['categories', 'contacts', 'paymentModes', 'products']" 
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
            activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'
          ]"
        >
          {{ tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1') }}
        </button>
      </div>

      <!-- Book Selector for Categories -->
      <div v-if="activeTab === 'categories'" class="bg-white p-4 rounded-xl shadow-sm space-y-2">
        <label class="text-sm font-medium text-gray-700">Select Book</label>
        <select v-model="selectedBookId" class="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5">
          <option v-for="book in bookStore.books" :key="book.id" :value="book.id">
            {{ book.name }}
          </option>
        </select>
        <p v-if="!selectedBookId" class="text-xs text-red-500">Please select a book to manage categories.</p>
      </div>

      <!-- List -->
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-800">
            Manage {{ activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/([A-Z])/g, ' $1') }}
          </h2>
          <BaseButton size="sm" @click="openAddModal">Add New</BaseButton>
        </div>

        <div v-if="activeTab === 'categories'" class="space-y-3">
          <div v-for="item in masterStore.categories" :key="item.id" class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500">{{ item.description }}</p>
            </div>
            <button @click="deleteItem(item.id)" class="text-red-500 hover:text-red-700 p-2">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div v-if="masterStore.categories.length === 0" class="text-center text-gray-500 py-4">
            No categories found for this book.
          </div>
        </div>

        <div v-if="activeTab === 'contacts'" class="space-y-3">
          <div v-for="item in masterStore.contacts" :key="item.id" class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500">{{ item.phone }}</p>
            </div>
            <button @click="deleteItem(item.id)" class="text-red-500 hover:text-red-700 p-2">Delete</button>
          </div>
        </div>

        <div v-if="activeTab === 'paymentModes'" class="space-y-3">
          <div v-for="item in masterStore.paymentModes" :key="item.id" class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500 capitalize">{{ item.type }}</p>
            </div>
            <button @click="deleteItem(item.id)" class="text-red-500 hover:text-red-700 p-2">Delete</button>
          </div>
        </div>

        <div v-if="activeTab === 'products'" class="space-y-3">
          <div v-for="item in masterStore.products" :key="item.id" class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
            <div @click="openEditModal(item)" class="flex-1 cursor-pointer">
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500">Rate: {{ item.rate }}</p>
              <p class="text-xs text-gray-400">{{ item.description }}</p>
            </div>
            <div class="flex gap-2">
              <button @click="openEditModal(item)" class="text-indigo-600 hover:text-indigo-800 p-2">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button @click="deleteItem(item.id)" class="text-red-500 hover:text-red-700 p-2">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Add/Edit Modal -->
    <Modal :show="showModal" :title="(editingItem ? 'Edit ' : 'Add ') + activeTab" @close="showModal = false">
      <div class="space-y-4">
        <BaseInput v-model="newItemName" label="Name" autoFocus />
        
        <div v-if="activeTab === 'categories' || activeTab === 'products'">
          <BaseInput v-model="newItemDescription" label="Description" placeholder="Optional" />
        </div>

        <BaseInput v-if="activeTab === 'contacts'" v-model="newItemType" label="Phone (Optional)" />
        
        <div v-if="activeTab === 'paymentModes'">
          <label class="text-sm font-medium text-gray-700 ml-1">Type</label>
          <select v-model="newItemType" class="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5">
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <BaseInput v-if="activeTab === 'products'" v-model="newItemRate" type="number" label="Default Rate" />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showModal = false">Cancel</BaseButton>
          <BaseButton @click="saveItem">Save</BaseButton>
        </div>
      </div>
    </Modal>
  </div>
</template>
