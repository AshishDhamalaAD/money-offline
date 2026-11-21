<script setup>
import { usePageFeedback } from "@/composables/usePageFeedback"
import BaseError from "@/components/common/BaseError.vue"
import ResourceState from "@/components/common/ResourceState.vue"

import { db } from "@/db/dexie"
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import { useContactStore } from "@/store/contactStore"
import IconTrash from "@/assets/icons/IconTrash.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import FixedSaveButton from "@/components/common/FixedSaveButton.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"

const { operationError, operationBusy, operationReady, operationAction, retryOperation, runOperation } = usePageFeedback()

const route = useRoute()
const router = useRouter()
const contactStore = useContactStore()

const contactId = route.params.id ? parseInt(route.params.id) : null
const isNew = !contactId

const form = ref({
  name: "",
  phone: "",
})

const showDeleteModal = ref(false)

const title = computed(() => {
  return (isNew ? "New " : "Edit ") + "Contact"
})

onMounted(async () => {
  return runOperation(async () => {
      if (!isNew) {
      const item = await db.contacts.get(contactId)
      if (!item) throw new Error('This contact is no longer available')
      fillForm(item)
    }
  }, "Could not load contact.", true)
})

function fillForm(item) {
  form.value.name = item.name
  form.value.phone = item.phone || ""
}

async function save() {
  return runOperation(async () => {
    if (!form.value.name) return

    if (isNew) {
      await contactStore.addContact(form.value.name, form.value.phone)
    } else {
      await contactStore.updateContact(contactId, {
        name: form.value.name,
        phone: form.value.phone,
      })
    }

    goBack()
  }, "Could not save contact.", false)
}

async function handleDelete() {
  return runOperation(async () => {
    await contactStore.deleteContact(contactId)
    goBack()
  }, "Could not delete contact.", false)
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
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
        >
          Delete
        </button>
      </template>
    </PageHeader>

    <main class="p-4 space-y-6">
      <ResourceState :resources="[contactStore]" />
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <div class="bg-white p-4 rounded-xl shadow-sm space-y-4 dark:bg-gray-900 dark:border dark:border-gray-800">
        <BaseInput v-model="form.name" label="Name" autoFocus required />
        <BaseInput v-model="form.phone" label="Phone (Optional)" />
      </div>
    </main>

    <FixedSaveButton :disabled="!operationReady || !contactStore.ready || !!contactStore.error" :loading="operationBusy" @click="save" />

    <!-- Delete Confirmation Modal -->
    <BaseModal :dismissible="!operationBusy" :show="showDeleteModal" title="Confirm Delete" @close="showDeleteModal = false">
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <p class="text-gray-600 dark:text-gray-300">
        Are you sure you want to delete this contact? This action cannot be undone.
      </p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" :disabled="operationBusy" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" :loading="operationBusy" @click="handleDelete">Delete</BaseButton>
      </div>
    </BaseModal>

  </PageLayout>
</template>
