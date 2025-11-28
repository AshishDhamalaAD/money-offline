<script setup>
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import { QUANTITY_TYPES } from "@/constants"
import { useProductStore } from "@/store/modules/productStore"
import { useCategoryStore } from "@/store/modules/categoryStore"
import IconPlus from "@/assets/icons/IconPlus.vue"
import IconTrash from "@/assets/icons/IconTrash.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseSearchableSelect from "@/components/common/BaseSearchableSelect.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import BaseToast from "@/components/common/BaseToast.vue"
import LightGallery from "@/components/common/LightGallery.vue"
import FixedSaveButton from "@/components/common/FixedSaveButton.vue"
import ProductHistoryButton from "@/components/common/ProductHistoryButton.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const categoryStore = useCategoryStore()

const bookId = parseInt(route.params.bookId)
const itemId = route.params.id ? parseInt(route.params.id) : null
const isNew = !itemId

const attachments = ref([])

const form = ref({
  name: "",
  description: "",
  rate: 0,
  quantity_type: "",
  category_id: "",
})

const showDeleteModal = ref(false)
const showToast = ref(false)
const toastMessage = ref("")

// Quick Add Category
const showCategoryModal = ref(false)
const newCategoryName = ref("")
const newCategoryDescription = ref("")

async function saveNewCategory() {
  if (!newCategoryName.value.trim()) return

  try {
    const id = await categoryStore.addCategory(newCategoryName.value, newCategoryDescription.value, bookId)
    form.value.category_id = id
    showCategoryModal.value = false
    newCategoryName.value = ""
    newCategoryDescription.value = ""
  } catch (e) {
    console.error(e)
    alert("Failed to add category")
  }
}

const title = computed(() => {
  return (isNew ? "New " : "Edit ") + "Product"
})

onMounted(async () => {
  productStore.watchProducts(bookId)
  categoryStore.watchCategories(bookId)

  if (!isNew) {
    // Hack: wait for data
    const unsubscribe = productStore.$subscribe((mutation, state) => {
      const list = state.products
      const item = list.find((i) => i.id === itemId)
      if (item) {
        fillForm(item)
      }
    })

    // Also try immediately
    const list = productStore.products
    const item = list.find((i) => i.id === itemId)
    if (item) fillForm(item)
  }
})

function fillForm(item) {
  form.value.name = item.name
  form.value.description = item.description || ""
  form.value.rate = item.rate || 0
  form.value.quantity_type = item.quantity_type || ""
  form.value.category_id = item.category_id || ""

  if (item.attachments && item.attachments.length > 0) {
    attachments.value = item.attachments
  }
}

async function save() {
  if (!form.value.name) return

  if (isNew) {
    await productStore.addProduct(
      form.value.name,
      form.value.rate,
      form.value.description,
      form.value.quantity_type,
      bookId,
      form.value.category_id
    )
  } else {
    await productStore.updateProduct(itemId, {
      name: form.value.name,
      rate: form.value.rate,
      description: form.value.description,
      quantity_type: form.value.quantity_type,
      category_id: form.value.category_id,
    })
  }

  goBack()
}

async function handleDelete() {
  try {
    await productStore.deleteProduct(itemId)
    goBack()
  } catch (error) {
    toastMessage.value = error.message
    showToast.value = true
    showDeleteModal.value = false
  }
}

function goBack() {
  router.push({
    name: "book-settings-products",
    params: { bookId },
    query: route.query,
  })
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="title" :back-route="{ name: 'book-settings-products', params: { bookId }, query: route.query }">
      <template #actions>
        <button
          v-if="!isNew"
          @click="showDeleteModal = true"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <IconTrash class="h-5 w-5" />
        </button>

        <ProductHistoryButton v-if="!isNew" :product-id="itemId" :book-id="bookId" />
      </template>
    </PageHeader>

    <main class="p-4 space-y-6">
      <div class="bg-white p-4 rounded-sm shadow-sm space-y-4">
        <LightGallery :images="attachments" />

        <BaseInput v-model="form.name" label="Name" autoFocus required />

        <div class="space-y-4">
          <BaseInput v-model="form.rate" type="number" label="Rate" required />
          <BaseSearchableSelect
            v-model="form.quantity_type"
            :options="QUANTITY_TYPES"
            label="Quantity Type"
            placeholder="Select quantity type"
            required
          />

          <div class="flex items-end gap-2">
            <div class="flex-1">
              <BaseSearchableSelect
                v-model="form.category_id"
                label="Category"
                :options="categoryStore.categories.map((c) => ({ label: c.name, value: c.id }))"
                placeholder="Select Category"
              />
            </div>
            <button
              @click="showCategoryModal = true"
              class="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all"
            >
              <IconPlus />
            </button>
          </div>
        </div>

        <BaseInput v-model="form.description" label="Description" placeholder="Optional" />
      </div>
    </main>

    <FixedSaveButton @click="save" />

    <!-- Add Category Modal -->
    <BaseModal :show="showCategoryModal" title="Add New Category" @close="showCategoryModal = false">
      <div class="space-y-4">
        <BaseInput v-model="newCategoryName" label="Category Name" placeholder="e.g. Groceries" autoFocus />

        <BaseInput v-model="newCategoryDescription" label="Description" placeholder="Optional" />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showCategoryModal = false">Cancel</BaseButton>
          <BaseButton @click="saveNewCategory">Add Category</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Delete Confirmation Modal -->
    <BaseModal :show="showDeleteModal" title="Confirm Delete" @close="showDeleteModal = false">
      <p class="text-gray-600">Are you sure you want to delete this product? This action cannot be undone.</p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="handleDelete">Delete</BaseButton>
      </div>
    </BaseModal>

    <!-- Toast Notification -->
    <BaseToast :show="showToast" :message="toastMessage" type="error" @close="showToast = false" />
  </PageLayout>
</template>
