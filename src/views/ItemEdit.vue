<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMasterStore } from '../stores/masterStore'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import Modal from '../components/ui/Modal.vue'

const route = useRoute()
const router = useRouter()
const masterStore = useMasterStore()

const bookId = parseInt(route.params.bookId)
const type = route.params.type // 'categories', 'products', 'paymentModes'
const itemId = route.params.itemId ? parseInt(route.params.itemId) : null
const isNew = !itemId

const quantityTypes = [
  { label: 'Kilogram (kg)', value: 'kg' },
  { label: 'Gram (g)', value: 'g' },
  { label: 'Liter (l)', value: 'l' },
  { label: 'Milliliter (ml)', value: 'ml' },
  { label: 'Pieces (pcs)', value: 'pcs' },
  { label: 'Box', value: 'box' },
  { label: 'Dozen', value: 'dozen' }
]

const form = ref({
  name: '',
  description: '',
  rate: 0,
  quantity_type: ''
})

const showDeleteModal = ref(false)

const title = computed(() => {
  const typeLabel = type === 'paymentModes' ? 'Payment Mode' : type.slice(0, -1).charAt(0).toUpperCase() + type.slice(0, -1).slice(1)
  return (isNew ? 'New ' : 'Edit ') + typeLabel
})

onMounted(async () => {
  if (!isNew) {
    masterStore.watchBookData(bookId)
    
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
    form.value.quantity_type = item.quantity_type || ''
}

async function save() {
  if (!form.value.name) return

  if (type === 'categories') {
    if (isNew) await masterStore.addCategory(form.value.name, form.value.description, bookId)
    else await masterStore.updateCategory(itemId, { name: form.value.name, description: form.value.description })
  } else if (type === 'products') {
    if (isNew) await masterStore.addProduct(form.value.name, form.value.rate, form.value.description, form.value.quantity_type, bookId)
    else await masterStore.updateProduct(itemId, { 
      name: form.value.name, 
      rate: form.value.rate, 
      description: form.value.description,
      quantity_type: form.value.quantity_type
    })
  } else if (type === 'paymentModes') {
    if (isNew) await masterStore.addPaymentMode(form.value.name, form.value.description, bookId)
    else await masterStore.updatePaymentMode(itemId, { name: form.value.name, description: form.value.description })
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
  router.push({ 
    name: 'book-settings', 
    params: { bookId },
    query: route.query // Preserve tab
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <header class="bg-white px-4 py-4 shadow-sm sticky top-0 z-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button @click="goBack" class="rounded-full p-1 text-gray-600 hover:bg-gray-100">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-xl font-bold text-gray-900">{{ title }}</h1>
      </div>
      <button v-if="!isNew" @click="showDeleteModal = true" class="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </header>

    <main class="p-4 space-y-6">
      <div class="bg-white p-4 rounded-xl shadow-sm space-y-4">
        <BaseInput v-model="form.name" label="Name" autoFocus required />

        <div v-if="type === 'products'" class="space-y-4">
          <BaseInput v-model="form.rate" type="number" label="Rate" required />
          <SearchableSelect 
            v-model="form.quantity_type" 
            label="Quantity Type" 
            :options="quantityTypes"
            placeholder="Select Type"
            required
          />
        </div>

        <!-- Description at bottom for all -->
        <BaseInput v-model="form.description" label="Description" placeholder="Optional" />

        <div class="pt-4 flex gap-3">
          <BaseButton class="flex-1" @click="save">Save</BaseButton>
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
