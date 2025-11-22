<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBookStore } from '../stores/bookStore'
import BookCard from '../components/BookCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import Modal from '../components/ui/Modal.vue'
import PageLayout from '../components/layout/PageLayout.vue'
import PageHeader from '../components/layout/PageHeader.vue'

const bookStore = useBookStore()
const showCreateModal = ref(false)
const newBookName = ref('')
const creating = ref(false)

async function handleCreateBook() {
    if (!newBookName.value.trim()) return

    creating.value = true
    try {
        await bookStore.createBook(newBookName.value)
        showCreateModal.value = false
        newBookName.value = ''
    } finally {
        creating.value = false
    }
}
</script>

<template>
    <PageLayout>
        <PageHeader title="My Books"
                    :showBack="false">
            <template #actions>
                <button @click="$router.push({ name: 'settings' })"
                        class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
                    <svg class="h-6 w-6"
                         fill="none"
                         viewBox="0 0 24 24"
                         stroke="currentColor">
                        <path stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </template>
        </PageHeader>

        <!-- Content -->
        <main class="p-4">
            <div v-if="bookStore.books.length === 0"
                 class="mt-10 flex flex-col items-center justify-center text-center">
                <div class="mb-4 rounded-full bg-indigo-50 p-4 text-indigo-600">
                    <svg class="h-10 w-10"
                         fill="none"
                         viewBox="0 0 24 24"
                         stroke="currentColor">
                        <path stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900">No books yet</h3>
                <p class="mt-1 text-gray-500">Create your first book to start tracking expenses.</p>
                <div class="mt-6">
                    <BaseButton @click="showCreateModal = true">Create Book</BaseButton>
                </div>
            </div>

            <div v-else
                 class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <BookCard v-for="book in bookStore.books"
                          :key="book.id"
                          :book="book" />
            </div>
        </main>

        <!-- FAB (Floating Action Button) -->
        <div v-if="bookStore.books.length > 0"
             class="fixed bottom-6 right-6">
            <button @click="showCreateModal = true"
                    class="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105 active:scale-95">
                <svg class="h-6 w-6"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor">
                    <path stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>

        <!-- Create Book Modal -->
        <Modal :show="showCreateModal"
               title="Create New Book"
               @close="showCreateModal = false">
            <div class="space-y-4">
                <BaseInput v-model="newBookName"
                           label="Book Name"
                           placeholder="e.g. Personal Expenses"
                           autoFocus />
                <div class="flex justify-end gap-3 mt-6">
                    <BaseButton variant="ghost"
                                @click="showCreateModal = false">Cancel</BaseButton>
                    <BaseButton :loading="creating"
                                @click="handleCreateBook">Create</BaseButton>
                </div>
            </div>
        </Modal>
    </PageLayout>
</template>
