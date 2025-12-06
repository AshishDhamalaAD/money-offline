<script setup>
import { ref, computed } from "vue"
import { useRouter } from "vue-router"

import { useContactStore } from "@/store/contactStore"
import BaseButton from "@/components/common/BaseButton.vue"
import SearchInput from "@/components/common/BaseSearchInput.vue"

const router = useRouter()
const contactStore = useContactStore()
const searchQuery = ref("")

const filteredContacts = computed(() => {
  if (!searchQuery.value) return contactStore.contacts

  const query = searchQuery.value.toLowerCase()
  return contactStore.contacts.filter(
    (contact) => contact.name.toLowerCase().includes(query) || (contact.phone && contact.phone.includes(query))
  )
})

function navigateToAdd() {
  router.push({ name: "new-contact" })
}

function navigateToEdit(contact) {
  router.push({ name: "edit-contact", params: { id: contact.id } })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Manage Contacts</h2>
        <BaseButton size="sm" @click="navigateToAdd">Add New</BaseButton>
      </div>

      <!-- Search Input -->
      <SearchInput v-model="searchQuery" placeholder="Search contacts..." />
    </div>

    <div class="space-y-3">
      <div
        v-for="item in filteredContacts"
        :key="item.id"
        @click="navigateToEdit(item)"
        class="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm cursor-pointer hover:bg-gray-50 transition-colors dark:bg-gray-900 dark:hover:bg-gray-800 dark:border dark:border-gray-800"
      >
        <div>
          <p class="font-medium text-gray-900 dark:text-gray-100">{{ item.name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.phone }}</p>
        </div>
        <svg class="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div v-if="filteredContacts.length === 0" class="text-center text-gray-500 py-4 dark:text-gray-400">
        No contacts found.
      </div>
    </div>
  </div>
</template>
