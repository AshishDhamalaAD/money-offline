<script setup>
import { useRouter } from 'vue-router'
import { useMasterStore } from '../stores/masterStore'
import BaseButton from '../components/ui/BaseButton.vue'
import DatabaseBackup from '../components/DatabaseBackup.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import PageHeader from '../components/layout/PageHeader.vue'

import { ref } from 'vue'
import { db } from '../db'
import Modal from '../components/ui/Modal.vue'

const router = useRouter()
const masterStore = useMasterStore()
const showResetModal = ref(false)
const resetting = ref(false)

function navigateToAdd() {
    router.push({ name: 'new-contact' })
}

function navigateToEdit(contact) {
    router.push({ name: 'edit-contact', params: { id: contact.id } })
}

async function resetDatabase() {
    resetting.value = true
    try {
        await db.delete()
        window.location.reload()
    } catch (e) {
        console.error('Failed to reset database:', e)
        alert('Failed to reset database')
        resetting.value = false
    }
}
</script>

<template>
    <PageLayout>
        <PageHeader title="Settings"
                    :backRoute="{ name: 'dashboard' }" />

        <main class="p-4 space-y-6">
            <!-- Database Backup & Restore -->
            <DatabaseBackup />

            <!-- Contacts Section -->
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <h2 class="text-lg font-semibold text-gray-800">
                        Manage Contacts
                    </h2>
                    <BaseButton size="sm"
                                @click="navigateToAdd">Add New</BaseButton>
                </div>

                <div class="space-y-3">
                    <div v-for="item in masterStore.contacts"
                         :key="item.id"
                         @click="navigateToEdit(item)"
                         class="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
                        <div>
                            <p class="font-medium">{{ item.name }}</p>
                            <p class="text-xs text-gray-500">{{ item.phone }}</p>
                        </div>
                        <svg class="h-5 w-5 text-gray-400"
                             fill="none"
                             viewBox="0 0 24 24"
                             stroke="currentColor">
                            <path stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <div v-if="masterStore.contacts.length === 0"
                         class="text-center text-gray-500 py-4">
                        No contacts found.
                    </div>
                </div>
            </div>

            <!-- Danger Zone -->
            <div class="space-y-4 pt-6 border-t border-gray-200">
                <h2 class="text-lg font-semibold text-red-600">
                    Danger Zone
                </h2>
                <div class="bg-red-50 border border-red-100 rounded-sm p-4">
                    <div class="flex justify-between items-center">
                        <div>
                            <h3 class="font-medium text-red-800">Reset Database</h3>
                            <p class="text-sm text-red-600 mt-1">
                                This will permanently delete all your data. This action cannot be undone.
                            </p>
                        </div>
                        <BaseButton variant="danger"
                                    @click="showResetModal = true">
                            Reset Database
                        </BaseButton>
                    </div>
                </div>
            </div>
        </main>

        <!-- Reset Confirmation Modal -->
        <Modal :show="showResetModal"
               title="Reset Database"
               @close="showResetModal = false">
            <div class="space-y-4">
                <p class="text-gray-600">
                    Are you sure you want to reset the database? This will wipe all your data including books, transactions, contacts, and settings.
                </p>

                <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p class="text-sm text-red-800">
                        <strong>Warning:</strong> This action is irreversible!
                    </p>
                </div>

                <div class="flex justify-end gap-3 mt-6">
                    <BaseButton variant="ghost"
                                @click="showResetModal = false">Cancel</BaseButton>
                    <BaseButton variant="danger"
                                :loading="resetting"
                                @click="resetDatabase">Yes, Reset Everything</BaseButton>
                </div>
            </div>
        </Modal>
    </PageLayout>
</template>
