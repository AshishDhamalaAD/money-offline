<script setup>
import { usePageFeedback } from "@/composables/usePageFeedback"
import BaseError from "@/components/common/BaseError.vue"
import ResourceState from "@/components/common/ResourceState.vue"

import { db } from "@/db/dexie"
import { discardUnusedUploads } from "@/services/uploadQueue"
import { ref, onMounted, computed, toRaw } from "vue"
import { useRoute, useRouter } from "vue-router"

import { QUANTITY_TYPES, DEFAULT_QUANTITY_TYPE } from "@/constants"
import { useProductStore } from "@/store/productStore"
import { useCategoryStore } from "@/store/categoryStore"
import IconPlus from "@/assets/icons/IconPlus.vue"
import IconTrash from "@/assets/icons/IconTrash.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseSearchableSelect from "@/components/common/BaseSearchableSelect.vue"
import BaseConfirm from "@/components/common/BaseConfirm.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import LightGallery from "@/components/common/LightGallery.vue"
import FixedSaveButton from "@/components/common/FixedSaveButton.vue"
import ProductHistoryButton from "@/components/common/ProductHistoryButton.vue"
import ImageUpload from "@/components/common/LazyImageUpload.vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"

const { operationError, operationBusy, operationReady, operationAction, retryOperation, runOperation } = usePageFeedback()

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
  quantity_type: DEFAULT_QUANTITY_TYPE,
  category_id: "",
})

const showDeleteModal = ref(false)

// Quick Add Category
const showCategoryModal = ref(false)
const newCategoryName = ref("")
const newCategoryDescription = ref("")

async function saveNewCategory() {
  return runOperation(async () => {
    if (!newCategoryName.value.trim()) return

    const id = await categoryStore.addCategory(newCategoryName.value, newCategoryDescription.value, bookId)
    form.value.category_id = id
    showCategoryModal.value = false
    newCategoryName.value = ""
    newCategoryDescription.value = ""
  }, "Could not add category.", false)
}

const title = computed(() => {
  return (isNew ? "New " : "Edit ") + "Product"
})

onMounted(async () => {
  return runOperation(async () => {
    productStore.watchProducts(bookId)
  categoryStore.watchCategories(bookId)
    if (!isNew) {
      const item = await db.products.get(itemId)
      if (!item) throw new Error('This product is no longer available')
      fillForm(item)
    }
  }, "Could not load product.", true)
})

function fillForm(item) {
  form.value.name = item.name
  form.value.description = item.description || ""
  form.value.rate = item.rate || 0
  form.value.quantity_type = item.quantity_type || DEFAULT_QUANTITY_TYPE
  form.value.category_id = item.category_id || ""

  if (item.attachments && item.attachments.length > 0) {
    attachments.value = [...item.attachments]
  }
}

function handleUpload(url) {
  attachments.value.push(url)
}

const pendingAttachment = ref(null)
const showRemoveAttachment = ref(false)
function removeAttachment(index) {
  pendingAttachment.value = index
  showRemoveAttachment.value = true
}
async function confirmRemoveAttachment() {
  return runOperation(async () => {
      const index = pendingAttachment.value
      await discardUnusedUploads([attachments.value[index]])
      attachments.value.splice(index, 1)
      showRemoveAttachment.value = false
  }, 'Could not remove attachment.')
}

async function save() {
  return runOperation(async () => {
    if (!form.value.name) return

    if (isNew) {
      await productStore.addProduct(
        form.value.name,
        form.value.rate,
        form.value.description,
        form.value.quantity_type,
        bookId,
        form.value.category_id,
        toRaw(attachments.value)
      )
    } else {
      await productStore.updateProduct(itemId, {
        name: form.value.name,
        rate: form.value.rate,
        description: form.value.description,
        quantity_type: form.value.quantity_type,
        category_id: form.value.category_id,
        attachments: toRaw(attachments.value),
      })
    }

    goBack()
  }, "Could not save product.", false)
}

async function handleDelete() {
  return runOperation(async () => {
    await productStore.deleteProduct(itemId)
    goBack()
  }, "Could not delete product.", false)
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
        <button type="button" aria-label="Delete product"
          v-if="!isNew"
          @click="showDeleteModal = true"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
        >
          <IconTrash class="h-5 w-5" />
        </button>

        <ProductHistoryButton v-if="!isNew" :product-id="itemId" :book-id="bookId" />
      </template>
    </PageHeader>

    <main class="p-4 space-y-6">
      <ResourceState :resources="[productStore, categoryStore]" />
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <div class="bg-white p-4 rounded-sm shadow-sm space-y-4 dark:bg-gray-900 dark:border dark:border-gray-800">
        <LightGallery :images="attachments" editable @delete="removeAttachment" />
        <ImageUpload @upload="handleUpload" from="products" />

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
            <button type="button" aria-label="Add category"
              @click="showCategoryModal = true"
              class="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all dark:bg-indigo-900/40 dark:text-indigo-100 dark:hover:bg-indigo-900/60"
            >
              <IconPlus />
            </button>
          </div>
        </div>

        <BaseInput v-model="form.description" label="Description" placeholder="Optional" />
      </div>
    </main>

    <FixedSaveButton :disabled="!operationReady || !productStore.ready || !!productStore.error || !categoryStore.ready || !!categoryStore.error" :loading="operationBusy" @click="save" />

    <!-- Add Category Modal -->
    <BaseModal :dismissible="!operationBusy" :show="showCategoryModal" title="Add New Category" @close="showCategoryModal = false">
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <div class="space-y-4">
        <BaseInput v-model="newCategoryName" label="Category Name" placeholder="e.g. Groceries" autoFocus />

        <BaseInput v-model="newCategoryDescription" label="Description" placeholder="Optional" />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" :disabled="operationBusy" @click="showCategoryModal = false">Cancel</BaseButton>
          <BaseButton :loading="operationBusy" @click="saveNewCategory">Add Category</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Delete Confirmation Modal -->
    <BaseModal :dismissible="!operationBusy" :show="showDeleteModal" title="Confirm Delete" @close="showDeleteModal = false">
      <BaseError :message="operationError" :action-label="operationAction" :busy="operationBusy" @retry="retryOperation" />
      <p class="text-gray-600 dark:text-gray-300">
        Are you sure you want to delete this product? This action cannot be undone.
      </p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" :disabled="operationBusy" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" :loading="operationBusy" @click="handleDelete">Delete</BaseButton>
      </div>
    </BaseModal>

    <BaseConfirm v-model="showRemoveAttachment" title="Remove attachment?" message="Remove this image from the product?" confirm-label="Remove" variant="danger" :loading="operationBusy" @confirm="confirmRemoveAttachment">
      <BaseError :message="operationError" action-label="" />
    </BaseConfirm>
  </PageLayout>
</template>
