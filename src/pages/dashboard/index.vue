<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

import { useBookStore } from "@/store/bookStore"
import IconSettings from "@/assets/icons/IconSettings.vue"
import IconBook from "@/assets/icons/IconBook.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import FloatingActionButton from "@/components/common/FloatingActionButton.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import BookCard from "@/pages/dashboard/BookCard.vue"

const bookStore = useBookStore()
const showCreateModal = ref(false)
const newBookName = ref("")
const creating = ref(false)

async function handleCreateBook() {
  if (!newBookName.value.trim()) return

  creating.value = true
  try {
    await bookStore.createBook(newBookName.value)
    showCreateModal.value = false
    newBookName.value = ""
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <PageLayout>
    <PageHeader title="My Books" :showBack="false">
      <template #actions>
        <button
          @click="$router.push({ name: 'settings' })"
          class="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
        >
          <IconSettings />
        </button>
      </template>
    </PageHeader>

    <!-- Content -->
    <main class="p-4">
      <div v-if="bookStore.books.length === 0" class="mt-10 flex flex-col items-center justify-center text-center">
        <div class="mb-4 rounded-full bg-indigo-50 p-4 text-indigo-600">
          <IconBook class="h-10 w-10" />
        </div>
        <h3 class="text-lg font-medium text-gray-900">No books yet</h3>
        <p class="mt-1 text-gray-500">Create your first book to start tracking expenses.</p>
        <div class="mt-6">
          <BaseButton @click="showCreateModal = true">Create Book</BaseButton>
        </div>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BookCard v-for="book in bookStore.books" :key="book.id" :book="book" />
      </div>
    </main>

    <!-- FAB (Floating Action Button) -->
    <FloatingActionButton :show="bookStore.sortedBooks.length > 0" @click="showCreateModal = true" />

    <!-- Create Book Modal -->
    <BaseModal :show="showCreateModal" title="Create New Book" @close="showCreateModal = false">
      <div class="space-y-4">
        <BaseInput v-model="newBookName" label="Book Name" placeholder="e.g. Personal Expenses" autoFocus />
        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showCreateModal = false">Cancel</BaseButton>
          <BaseButton :loading="creating" @click="handleCreateBook">Create</BaseButton>
        </div>
      </div>
    </BaseModal>
  </PageLayout>
</template>
