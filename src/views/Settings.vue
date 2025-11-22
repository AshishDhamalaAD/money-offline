<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMasterStore } from '../stores/masterStore'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import Modal from '../components/ui/Modal.vue'

const router = useRouter()
const masterStore = useMasterStore()

const showModal = ref(false)
const newItemName = ref('')
const newItemPhone = ref('')

function openAddModal() {
  newItemName.value = ''
  newItemPhone.value = ''
  showModal.value = true
}

async function saveItem() {
  if (!newItemName.value) return
  await masterStore.addContact(newItemName.value, newItemPhone.value)
  showModal.value = false
}

async function deleteItem(id) {
  if (!confirm('Are you sure?')) return
  await masterStore.deleteContact(id)
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
      <!-- List -->
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-800">
            Manage Contacts
          </h2>
          <BaseButton size="sm" @click="openAddModal">Add New</BaseButton>
        </div>

        <div class="space-y-3">
          <div v-for="item in masterStore.contacts" :key="item.id" class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500">{{ item.phone }}</p>
            </div>
            <button @click="deleteItem(item.id)" class="text-red-500 hover:text-red-700 p-2">Delete</button>
          </div>
          <div v-if="masterStore.contacts.length === 0" class="text-center text-gray-500 py-4">
            No contacts found.
          </div>
        </div>
      </div>
    </main>

    <!-- Add Modal -->
    <Modal :show="showModal" title="Add Contact" @close="showModal = false">
      <div class="space-y-4">
        <BaseInput v-model="newItemName" label="Name" autoFocus required />
        <BaseInput v-model="newItemPhone" label="Phone (Optional)" />
        
        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showModal = false">Cancel</BaseButton>
          <BaseButton @click="saveItem">Save</BaseButton>
        </div>
      </div>
    </Modal>
  </div>
</template>
