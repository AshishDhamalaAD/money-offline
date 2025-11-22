<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMasterStore } from '../stores/masterStore'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import Modal from '../components/ui/Modal.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import PageHeader from '../components/layout/PageHeader.vue'

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
  <PageLayout>
    <PageHeader :title="title" @back="goBack">
      <template #actions>
        <button 
          v-if="!isNew" 
          @click="showDeleteModal = true" 
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
        <BaseButton size="sm" @click="save">Save</BaseButton>
      </template>
    </PageHeader>

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
  </PageLayout>
</template>
