<script setup>
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import { useCategoryStore } from "@/store/categoryStore"
import IconTrash from "@/assets/icons/IconTrash.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import BaseToast from "@/components/common/BaseToast.vue"
import FixedSaveButton from "@/components/common/FixedSaveButton.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()

const bookId = parseInt(route.params.bookId)
const itemId = route.params.id ? parseInt(route.params.id) : null
const isNew = !itemId

const form = ref({
  name: "",
  description: "",
})

const showDeleteModal = ref(false)
const showToast = ref(false)
const toastMessage = ref("")

const title = computed(() => {
  return (isNew ? "New " : "Edit ") + "Category"
})

onMounted(async () => {
  categoryStore.watchCategories(bookId)

  if (!isNew) {
    // Hack: wait for data
    const unsubscribe = categoryStore.$subscribe((mutation, state) => {
      const list = state.categories
      const item = list.find((i) => i.id === itemId)
      if (item) {
        fillForm(item)
      }
    })

    // Also try immediately
    const list = categoryStore.categories
    const item = list.find((i) => i.id === itemId)
    if (item) fillForm(item)
  }
})

function fillForm(item) {
  form.value.name = item.name
  form.value.description = item.description || ""
}

async function save() {
  if (!form.value.name) return

  if (isNew) {
    await categoryStore.addCategory(form.value.name, form.value.description, bookId)
  } else {
    await categoryStore.updateCategory(itemId, {
      name: form.value.name,
      description: form.value.description,
    })
  }

  goBack()
}

async function handleDelete() {
  try {
    await categoryStore.deleteCategory(itemId)
    goBack()
  } catch (error) {
    toastMessage.value = error.message
    showToast.value = true
    showDeleteModal.value = false
  }
}

function goBack() {
  router.push({
    name: "book-settings-categories",
    params: { bookId },
    query: route.query,
  })
}
</script>

<template>
  <PageLayout>
    <PageHeader
      :title="title"
      :back-route="{ name: 'book-settings-categories', params: { bookId }, query: route.query }"
    >
      <template #actions>
        <button
          v-if="!isNew"
          @click="showDeleteModal = true"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
        >
          <IconTrash class="h-5 w-5" />
        </button>
      </template>
    </PageHeader>

    <main class="p-4 space-y-6">
      <div class="bg-white p-4 rounded-sm shadow-sm space-y-4 dark:bg-gray-900 dark:border dark:border-gray-800">
        <BaseInput v-model="form.name" label="Name" autoFocus required />
        <BaseInput v-model="form.description" label="Description" placeholder="Optional" />
      </div>
    </main>

    <FixedSaveButton @click="save" />

    <!-- Delete Confirmation Modal -->
    <BaseModal :show="showDeleteModal" title="Confirm Delete" @close="showDeleteModal = false">
      <p class="text-gray-600 dark:text-gray-300">
        Are you sure you want to delete this category? This action cannot be undone.
      </p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="handleDelete">Delete</BaseButton>
      </div>
    </BaseModal>

    <!-- Toast Notification -->
    <BaseToast :show="showToast" :message="toastMessage" type="error" @close="showToast = false" />
  </PageLayout>
</template>
