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

const contactId = route.params.id ? parseInt(route.params.id) : null
const isNew = !contactId

const form = ref({
  name: '',
  phone: ''
})

const showDeleteModal = ref(false)

const title = computed(() => isNew ? 'New Contact' : 'Edit Contact')

onMounted(async () => {
  if (!isNew) {
    // Ensure contacts are loaded
    // masterStore.contacts is a liveQuery array, so it should be populated if we wait a bit or if already loaded
    // Ideally we should have a getContact method or wait for subscription
    // For now, let's assume it's populated since we came from the list
    const contact = masterStore.contacts.find(c => c.id === contactId)
    if (contact) {
      form.value.name = contact.name
      form.value.phone = contact.phone || ''
    } else {
        // If refreshed, might need to wait. 
        // Simple hack: watch contacts
        const unwatch = masterStore.$subscribe((mutation, state) => {
            const c = state.contacts.find(c => c.id === contactId)
            if (c) {
                form.value.name = c.name
                form.value.phone = c.phone || ''
                unwatch()
            }
        })
    }
  }
})

async function save() {
  if (!form.value.name) return

  if (isNew) {
    await masterStore.addContact(form.value.name, form.value.phone)
  } else {
    await masterStore.updateContact(contactId, { name: form.value.name, phone: form.value.phone })
  }

  goBack()
}

async function handleDelete() {
  await masterStore.deleteContact(contactId)
  goBack()
}

function goBack() {
  router.push({ name: 'settings' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <header class="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
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
        <BaseInput v-model="form.phone" label="Phone (Optional)" />

        <div class="pt-4 flex gap-3">
          <BaseButton class="flex-1" @click="save">Save</BaseButton>
        </div>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <Modal :show="showDeleteModal" title="Confirm Delete" @close="showDeleteModal = false">
      <p class="text-gray-600">Are you sure you want to delete this contact? This action cannot be undone.</p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="handleDelete">Delete</BaseButton>
      </div>
    </Modal>
  </div>
</template>
