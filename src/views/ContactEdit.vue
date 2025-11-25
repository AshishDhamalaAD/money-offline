<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useMasterStore } from "../stores/masterStore"
import BaseButton from "../components/ui/BaseButton.vue"
import BaseInput from "../components/ui/BaseInput.vue"
import Modal from "../components/ui/Modal.vue"
import Toast from "../components/ui/Toast.vue"
import PageLayout from "../components/layout/PageLayout.vue"
import PageHeader from "../components/layout/PageHeader.vue"

const route = useRoute()
const router = useRouter()
const masterStore = useMasterStore()

const contactId = route.params.id ? parseInt(route.params.id) : null
const isNew = !contactId

const form = ref({
  name: "",
  phone: "",
})

const showDeleteModal = ref(false)
const showToast = ref(false)
const toastMessage = ref("")

onMounted(async () => {
  if (!isNew) {
    // Ensure contacts are loaded
    // masterStore.contacts is a liveQuery array, so it should be populated if we wait a bit or if already loaded
    // Ideally we should have a getContact method or wait for subscription
    // For now, let's assume it's populated since we came from the list
    const contact = masterStore.contacts.find((c) => c.id === contactId)
    if (contact) {
      form.value.name = contact.name
      form.value.phone = contact.phone || ""
    } else {
      // If refreshed, might need to wait.
      // Simple hack: watch contacts
      const unwatch = masterStore.$subscribe((mutation, state) => {
        const c = state.contacts.find((c) => c.id === contactId)
        if (c) {
          form.value.name = c.name
          form.value.phone = c.phone || ""
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
  try {
    await masterStore.deleteContact(contactId)
    goBack()
  } catch (error) {
    toastMessage.value = error.message
    showToast.value = true
    showDeleteModal.value = false
  }
}

function goBack() {
  router.push({ name: "settings" })
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="isNew ? 'New Contact' : 'Edit Contact'" :back-route="{ name: 'settings' }">
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

    <!-- Toast Notification -->
    <Toast :show="showToast" :message="toastMessage" type="error" @close="showToast = false" />
  </PageLayout>
</template>
