<script setup>
import { ref } from "vue"

import { useBookStore } from "@/store/bookStore"
import BaseError from "@/components/common/BaseError.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import Modal from "@/components/common/BaseModal.vue"

import router from "@/router"

const props = defineProps({
  bookId: {
    type: Number,
    required: true,
  },
})

const bookStore = useBookStore()

const showDeleteModal = ref(false)
const toastMessage = ref("")
const deleting = ref(false)

async function handleDeleteBook() {
  if (deleting.value) return
  deleting.value = true
  toastMessage.value = ''
  try {
    await bookStore.deleteBook(props.bookId)
    router.push({ name: "dashboard" })
  } catch (error) {
    console.error('Could not delete book', error)
    toastMessage.value = 'Could not finish deleting this book. Review the book and its records before trying Delete again.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <button
    @click="showDeleteModal = true"
    class="rounded-lg pl-0.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
  >
    Delete Book
  </button>

  <!-- Delete Confirmation Modal -->
  <Modal :show="showDeleteModal" title="Delete Book" :dismissible="!deleting" initial-focus="[data-dialog-cancel]" @close="showDeleteModal = false">
    <BaseError :message="toastMessage" action-label="" />
    <p class="text-gray-600 dark:text-gray-300">
      Are you sure you want to delete this book? This will also delete all associated categories, products, and payment
      modes, transactions, queued photos and Trash. This action cannot be undone.
    </p>
    <div class="flex justify-end gap-3 mt-6">
      <BaseButton data-dialog-cancel :disabled="deleting" variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
      <BaseButton :loading="deleting" variant="danger" @click="handleDeleteBook">Delete Book</BaseButton>
    </div>
  </Modal>

</template>
