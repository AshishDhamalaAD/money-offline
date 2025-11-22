<script setup>
import { useRouter } from 'vue-router'
import { useMasterStore } from '../stores/masterStore'
import BaseButton from '../components/ui/BaseButton.vue'
import DatabaseBackup from '../components/DatabaseBackup.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import PageHeader from '../components/layout/PageHeader.vue'

const router = useRouter()
const masterStore = useMasterStore()

function navigateToAdd() {
  router.push({ name: 'new-contact' })
}

function navigateToEdit(contact) {
  router.push({ name: 'edit-contact', params: { id: contact.id } })
}
</script>

<template>
  <PageLayout>
    <PageHeader title="Settings" />

    <main class="p-4 space-y-6">
      <!-- Database Backup & Restore -->
      <DatabaseBackup />
      
      <!-- Contacts Section -->
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-800">
            Manage Contacts
          </h2>
          <BaseButton size="sm" @click="navigateToAdd">Add New</BaseButton>
        </div>

        <div class="space-y-3">
          <div 
            v-for="item in masterStore.contacts" 
            :key="item.id" 
            @click="navigateToEdit(item)"
            class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-gray-500">{{ item.phone }}</p>
            </div>
            <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div v-if="masterStore.contacts.length === 0" class="text-center text-gray-500 py-4">
            No contacts found.
          </div>
        </div>
      </div>
    </main>
  </PageLayout>
</template>
