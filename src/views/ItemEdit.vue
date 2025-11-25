<script setup>
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useMasterStore } from "../stores/masterStore"
import { QUANTITY_TYPES } from "../constants"
import BaseButton from "../components/ui/BaseButton.vue"
import BaseInput from "../components/ui/BaseInput.vue"
import SearchableSelect from "../components/ui/SearchableSelect.vue"
import Modal from "../components/ui/Modal.vue"
import Toast from "../components/ui/Toast.vue"
import PageLayout from "../components/layout/PageLayout.vue"
import PageHeader from "../components/layout/PageHeader.vue"

const route = useRoute()
const router = useRouter()
const masterStore = useMasterStore()

const bookId = parseInt(route.params.bookId)
const type = route.params.type // 'categories', 'products', 'paymentModes'
const itemId = route.params.itemId ? parseInt(route.params.itemId) : null
const isNew = !itemId

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
    const id = await masterStore.addCategory(newCategoryName.value, newCategoryDescription.value, bookId)
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
  const typeLabel =
    type === "paymentModes" ? "Payment Mode" : type.slice(0, -1).charAt(0).toUpperCase() + type.slice(0, -1).slice(1)
  return (isNew ? "New " : "Edit ") + typeLabel
})

onMounted(async () => {
  masterStore.watchBookData(bookId)

  if (!isNew) {
    // Hack: wait for data
    const unsubscribe = masterStore.$subscribe((mutation, state) => {
      const list = state[type]
      const item = list.find((i) => i.id === itemId)
      if (item) {
        fillForm(item)
      }
    })

    // Also try immediately
    const list = masterStore[type]
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
}

async function save() {
  if (!form.value.name) return

  if (type === "categories") {
    if (isNew) await masterStore.addCategory(form.value.name, form.value.description, bookId)
    else await masterStore.updateCategory(itemId, { name: form.value.name, description: form.value.description })
  } else if (type === "products") {
    if (isNew)
      await masterStore.addProduct(
        form.value.name,
        form.value.rate,
        form.value.description,
        form.value.quantity_type,
        bookId,
        form.value.category_id
      )
    else
      await masterStore.updateProduct(itemId, {
        name: form.value.name,
        rate: form.value.rate,
        description: form.value.description,
        quantity_type: form.value.quantity_type,
        category_id: form.value.category_id,
      })
  } else if (type === "paymentModes") {
    if (isNew) await masterStore.addPaymentMode(form.value.name, form.value.description, bookId)
    else await masterStore.updatePaymentMode(itemId, { name: form.value.name, description: form.value.description })
  }

  goBack()
}

async function handleDelete() {
  try {
    if (type === "categories") await masterStore.deleteCategory(itemId)
    else if (type === "products") await masterStore.deleteProduct(itemId)
    else if (type === "paymentModes") await masterStore.deletePaymentMode(itemId)

    goBack()
  } catch (error) {
    toastMessage.value = error.message
    showToast.value = true
    showDeleteModal.value = false
  }
}

function goBack() {
  router.push({
    name: "book-settings",
    params: { bookId },
    query: route.query, // Preserve tab
  })
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="title" :back-route="{ name: 'book-settings', params: { bookId }, query: route.query }">
      <template #actions>
        <button
          v-if="!isNew"
          @click="showDeleteModal = true"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
        <BaseButton size="sm" @click="save">Save</BaseButton>
      </template>
    </PageHeader>

    <main class="p-4 space-y-6">
      <div class="bg-white p-4 rounded-sm shadow-sm space-y-4">
        <BaseInput v-model="form.name" label="Name" autoFocus required />

        <div v-if="type === 'products'" class="space-y-4">
          <BaseInput v-model="form.rate" type="number" label="Rate" required />
          <SearchableSelect
            v-model="form.quantity_type"
            :options="QUANTITY_TYPES"
            label="Quantity Type"
            placeholder="Select quantity type"
            required
          />

          <div class="flex items-end gap-2">
            <div class="flex-1">
              <SearchableSelect
                v-model="form.category_id"
                label="Category"
                :options="masterStore.categories.map((c) => ({ label: c.name, value: c.id }))"
                placeholder="Select Category"
              />
            </div>
            <button
              @click="showCategoryModal = true"
              class="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Description at bottom for all -->
        <BaseInput v-model="form.description" label="Description" placeholder="Optional" />

        <div class="pt-4 flex gap-3">
          <BaseButton class="flex-1" @click="save">Save</BaseButton>
        </div>
      </div>
    </main>

    <!-- Add Category Modal -->
    <Modal :show="showCategoryModal" title="Add New Category" @close="showCategoryModal = false">
      <div class="space-y-4">
        <BaseInput v-model="newCategoryName" label="Category Name" placeholder="e.g. Groceries" autoFocus />

        <BaseInput v-model="newCategoryDescription" label="Description" placeholder="Optional" />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showCategoryModal = false">Cancel</BaseButton>
          <BaseButton @click="saveNewCategory">Add Category</BaseButton>
        </div>
      </div>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal :show="showDeleteModal" title="Confirm Delete" @close="showDeleteModal = false">
      <p class="text-gray-600">Are you sure you want to delete this item? This action cannot be undone.</p>
      <div class="flex justify-end gap-3 mt-6">
        <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="handleDelete">Delete</BaseButton>
      </div>
    </Modal>

    <!-- Toast Notification -->
    <Toast :show="showToast" :message="toastMessage" type="error" @close="showToast = false" />
  </PageLayout>
</template>
