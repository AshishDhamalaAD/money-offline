<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMasterStore } from '../stores/masterStore'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import Modal from '../components/ui/Modal.vue'

const route = useRoute()
const router = useRouter()
const masterStore = useMasterStore()

const bookId = parseInt(route.params.bookId)
const type = route.params.type // 'categories', 'products', 'paymentModes'
const itemId = route.params.itemId ? parseInt(route.params.itemId) : null
const isNew = !itemId

const form = ref({
  name: '',
  description: '',
  rate: 0,
  type: 'cash' // for payment mode
})

const showDeleteModal = ref(false)

const title = computed(() => {
  const typeLabel = type === 'paymentModes' ? 'Payment Mode' : type.slice(0, -1).charAt(0).toUpperCase() + type.slice(0, -1).slice(1)
  return (isNew ? 'New ' : 'Edit ') + typeLabel
})

onMounted(async () => {
  if (!isNew) {
    // Fetch item details
    // Since we don't have a direct "get" method in store that returns a single item easily without subscription,
    // we might need to find it from the store's list if populated, or fetch from DB directly.
    // But masterStore.watchBookData might not be active here if we refreshed page.
    // Let's just use the store's arrays if available, or we might need to add a get method.
    // For simplicity, let's assume we came from the list and the store has data if we call watchBookData.
    
    masterStore.watchBookData(bookId)
    
    // Wait a tick for subscription? Or just fetch directly from DB for edit page to be safe?
    // Direct DB fetch is safer for deep linking/refresh.
    // But for now, let's try to find it in the store after a short delay or just implement a get in store?
    // Actually, let's just fetch from the arrays.
    
    // A better approach for Edit page is to just fetch the single item.
    // But our store doesn't expose that. Let's rely on the lists being populated.
    // We can wait for the lists to be populated.
    
    // Hack: wait for data
    const unsubscribe = masterStore.$subscribe((mutation, state) => {
        const list = state[type]
        const item = list.find(i => i.id === itemId)
        if (item) {
            fillForm(item)
        }
    })
    
    // Also try immediately
    const list = masterStore[type]
    const item = list.find(i => i.id === itemId)
    if (item) fillForm(item)
  }
})

function fillForm(item) {
    form.value.name = item.name
    form.value.description = item.description || ''
    form.value.rate = item.rate || 0
    form.value.type = item.type || 'cash'
}

async function save() {
  if (!form.value.name) return

  if (type === 'categories') {
    if (isNew) await masterStore.addCategory(form.value.name, form.value.description, bookId)
    else await masterStore.updateCategory(itemId, { name: form.value.name, description: form.value.description })
  } else if (type === 'products') {
    if (isNew) await masterStore.addProduct(form.value.name, form.value.rate, form.value.description, bookId)
    else await masterStore.updateProduct(itemId, { name: form.value.name, rate: form.value.rate, description: form.value.description })
  } else if (type === 'paymentModes') {
    if (isNew) await masterStore.addPaymentMode(form.value.name, form.value.type, bookId)
    else await masterStore.updatePaymentMode(itemId, { name: form.value.name, type: form.value.type })
  }

  goBack()
}

async function handleDelete() {
  if (type === 'categories') await masterStore.deleteCategory(itemId)
  else if (type === 'products') await masterStore.deleteProduct(itemId)
  else if (type === 'paymentModes') await masterStore.deletePaymentMode(itemId)
  
  goBack()
}

function goBack() {
  router.push({ name: 'book-settings', params: { bookId } })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <header class="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
      <button @click="goBack" class="rounded-full p-1 text-gray-600 hover:bg-gray-100">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-xl font-bold text-gray-900">{{ title }}</h1>
    </header>

    <main class="p-4 space-y-6">
      <div class="bg-white p-4 rounded-xl shadow-sm space-y-4">
        <BaseInput v-model="form.name" label="Name" autoFocus />

        <div v-if="type === 'categories' || type === 'products'">
          <BaseInput v-model="form.description" label="Description" placeholder="Optional" />
        </div>

        <div v-if="type === 'products'">
          <BaseInput v-model="form.rate" type="number" label="Default Rate" />
        </div>

        <div v-if="type === 'paymentModes'">
          <label class="text-sm font-medium text-gray-700 ml-1">Type</label>
          <select v-model="form.type" class="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5">
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <div class="pt-4 flex gap-3">
          <BaseButton class="flex-1" @click="save">Save</BaseButton>
        </div>
        
        <div v-if="!isNew" class="pt-4 border-t border-gray-100">
           <button @click="showDeleteModal = true" class="w-full text-red-500 py-2 font-medium hover:bg-red-50 rounded-xl transition-colors">
             Delete {{ type.slice(0, -1) }}
           </button>
        </div>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <Modal :show="showDeleteModal" title="Confirm Delete" @close="showDeleteModal = false">
      <p class="text-gray-600">Are you sure you want to delete this item? This action cannot be undone.</p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="handleDelete">Delete</BaseButton>
      </div>
    </Modal>
  </div>
</template>
