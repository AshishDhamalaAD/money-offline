<script setup>
import { ref } from "vue"

import { useBookStore } from "@/store/bookStore"
import BaseButton from "@/components/common/BaseButton.vue"
import Toast from "@/components/common/BaseToast.vue"
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
const showToast = ref(false)
const toastMessage = ref("")

async function handleDeleteBook() {
  try {
    await bookStore.deleteBook(props.bookId)
    router.push({ name: "dashboard" })
  } catch (error) {
    toastMessage.value = error.message
    showToast.value = true
    showDeleteModal.value = false
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
  <Modal :show="showDeleteModal" title="Delete Book" @close="showDeleteModal = false">
    <p class="text-gray-600 dark:text-gray-300">
      Are you sure you want to delete this book? This will also delete all associated categories, products, and payment
      modes. This action cannot be undone.
    </p>
    <div class="flex justify-end gap-3 mt-6">
      <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
      <BaseButton variant="danger" @click="handleDeleteBook">Delete Book</BaseButton>
    </div>
  </Modal>

  <!-- Toast Notification -->
  <Toast :show="showToast" :message="toastMessage" type="error" @close="showToast = false" />
</template>
