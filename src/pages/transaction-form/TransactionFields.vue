<script setup>
import BaseError from "@/components/common/BaseError.vue"
import { usePageFeedback } from "@/composables/usePageFeedback"
import { ref, watch, toRaw } from "vue"

import { QUANTITY_TYPES, DEFAULT_QUANTITY_TYPE } from "@/constants"
import { roundAmount } from "@/utils/dateUtils"
import { useCategoryStore } from "@/store/categoryStore"
import { useContactStore } from "@/store/contactStore"
import { usePaymentModeStore } from "@/store/paymentModeStore"
import { useProductStore } from "@/store/productStore"
import IconPlus from "@/assets/icons/IconPlus.vue"
import IconChevronDown from "@/assets/icons/IconChevronDown.vue"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseInput from "@/components/common/BaseInput.vue"
import BaseModal from "@/components/common/BaseModal.vue"
import BaseSearchableSelect from "@/components/common/BaseSearchableSelect.vue"
import LightGallery from "@/components/common/LightGallery.vue"
import ImageUpload from "@/components/common/LazyImageUpload.vue"
import ProductLineItem from "@/pages/transaction-form/ProductLineItem.vue"

const props = defineProps({
  bookId: {
    type: Number,
    required: true,
  },
  // The reactive form object owned by the page. Fields are edited in place so
  // the page can save it without syncing copies back and forth.
  form: {
    type: Object,
    required: true,
  },
  initialShowProducts: {
    type: Boolean,
    default: false,
  },
})

const { operationError, operationBusy, runOperation } = usePageFeedback()

const categoryStore = useCategoryStore()
const contactStore = useContactStore()
const paymentModeStore = usePaymentModeStore()
const productStore = useProductStore()

const showProducts = ref(props.initialShowProducts)



function addProduct() {
  props.form.products.push({
    id: Date.now(), // temp id
    name: "",
    quantity: 1,
    rate: 0,
    amount: 0,
  })
}

function removeProduct(index) {
  props.form.products.splice(index, 1)
  calculateTotal()
}

function updateProduct(index, item) {
  props.form.products[index] = item
  calculateTotal()
}

function calculateTotal() {
  // If no products, amount is manually entered, so don't overwrite it
  if (props.form.products.length === 0) return

  const productsTotal = props.form.products.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

  if (props.form.type === "out") {
    const discount = parseFloat(props.form.discount) || 0
    const charge = parseFloat(props.form.charge) || 0
    props.form.amount = roundAmount(Math.max(0, productsTotal - discount + charge))
  } else {
    props.form.amount = roundAmount(productsTotal)
  }
}

// Watch for type change to reset/recalc
watch(
  () => props.form.type,
  (newType) => {
    if (newType === "in") {
      props.form.discount = 0
      props.form.charge = 0
    }
    calculateTotal()
  },
)

// Quick Add Category
const showCategoryModal = ref(false)
const newCategoryName = ref("")
const newCategoryDescription = ref("")
const addingCategoryForProduct = ref(false)

async function saveNewCategory() {
  return runOperation(async () => {
    if (!newCategoryName.value.trim()) return

    const id = await categoryStore.addCategory(newCategoryName.value, newCategoryDescription.value, props.bookId)

    if (addingCategoryForProduct.value) {
      newProductCategoryId.value = id
    } else {
      props.form.category_ids.push(id)
    }

    showCategoryModal.value = false
    newCategoryName.value = ""
    newCategoryDescription.value = ""
    addingCategoryForProduct.value = false
  }, 'Could not add category.')
}

// Quick Add Payment Mode
const showPaymentModeModal = ref(false)
const newPaymentModeName = ref("")
const newPaymentModeDescription = ref("")

async function saveNewPaymentMode() {
  return runOperation(async () => {
    if (!newPaymentModeName.value.trim()) return

    const id = await paymentModeStore.addPaymentMode(newPaymentModeName.value, newPaymentModeDescription.value, props.bookId)
    props.form.payment_mode_id = id
    showPaymentModeModal.value = false
    newPaymentModeName.value = ""
    newPaymentModeDescription.value = ""
  }, 'Could not add payment method.')
}

// Quick Add Product
const showProductModal = ref(false)
const newProductName = ref("")
const newProductDescription = ref("")
const newProductRate = ref(0)
const newProductQuantityType = ref(DEFAULT_QUANTITY_TYPE)
const newProductAttachments = ref([])
const newProductCategoryId = ref("")

async function saveNewProduct() {
  return runOperation(async () => {
    if (!newProductName.value.trim()) return

    const id = await productStore.addProduct(
      newProductName.value,
      roundAmount(newProductRate.value),
      newProductDescription.value,
      newProductQuantityType.value,
      props.bookId,
      newProductCategoryId.value,
      toRaw(newProductAttachments.value),
    )

    // Auto-add the newly created product to the items list
    props.form.products.push({
      product_id: id,
      quantity: 1,
      rate: roundAmount(newProductRate.value),
      amount: roundAmount(newProductRate.value),
    })

    calculateTotal()

    showProductModal.value = false
    resetNewProductForm()
  }, 'Could not add product.')
}

function handleNewProductUpload(url) {
  newProductAttachments.value.push(url)
}

function removeNewProductAttachment(index) {
  newProductAttachments.value.splice(index, 1)
}

function resetNewProductForm() {
  newProductName.value = ""
  newProductDescription.value = ""
  newProductRate.value = 0
  newProductQuantityType.value = DEFAULT_QUANTITY_TYPE
  newProductCategoryId.value = ""
  newProductAttachments.value = []
}

function openProductModal() {
  resetNewProductForm()
  showProductModal.value = true
}

function closeProductModal() {
  if (operationBusy.value) return
  showProductModal.value = false
  resetNewProductForm()
}

function openCategoryModalForTransaction() {
  showCategoryModal.value = true
  addingCategoryForProduct.value = false
}

function openCategoryModalForProduct() {
  showCategoryModal.value = true
  addingCategoryForProduct.value = true
}

defineExpose({ calculateTotal })
</script>

<template>
  <div class="space-y-6">
    <!-- Type Selection -->
    <div class="flex rounded-sm bg-gray-200 p-1 dark:bg-gray-800">
      <button
        :aria-pressed="form.type === 'in'"
        @click="form.type = 'in'"
        :class="[
          'flex-1 rounded-sm py-2 text-sm font-medium transition-all',
          form.type === 'in'
            ? 'bg-white text-green-600 shadow-sm dark:bg-gray-900 dark:text-green-400'
            : 'text-gray-600 dark:text-gray-300',
        ]"
      >
        Cash In (+)
      </button>
      <button
        :aria-pressed="form.type === 'out'"
        @click="form.type = 'out'"
        :class="[
          'flex-1 rounded-sm py-2 text-sm font-medium transition-all',
          form.type === 'out'
            ? 'bg-white text-red-600 shadow-sm dark:bg-gray-900 dark:text-red-400'
            : 'text-gray-600 dark:text-gray-300',
        ]"
      >
        Cash Out (-)
      </button>
    </div>

    <!-- Basic Fields -->
    <div class="space-y-4 rounded-sm bg-white p-4 shadow-sm dark:bg-gray-900 dark:border dark:border-gray-800">
      <div>
        <BaseInput
          v-model.number="form.amount"
          type="number"
          step="0.01"
          inputmode="decimal"
          enterkeyhint="done"
          label="Amount"
          placeholder="0.00"
          required
          :readonly="form.products.length > 0"
          class="text-2xl font-semibold"
        />
        <p v-if="form.products.length > 0" class="mt-1 ml-1 text-xs text-gray-500 dark:text-gray-400">
          Calculated from the items below.
        </p>
      </div>

      <slot name="schedule" />
    </div>

    <!-- Details -->
    <div class="space-y-4 rounded-sm bg-white p-4 shadow-sm dark:bg-gray-900 dark:border dark:border-gray-800">
      <h3 class="font-medium text-gray-900 dark:text-gray-100">Details</h3>

      <div class="flex items-end gap-2">
        <div class="flex-1">
          <BaseSearchableSelect
            v-model="form.category_ids"
            label="Category"
            :options="
              categoryStore.categories.map((c) => ({ label: c.name, value: c.id, description: c.description }))
            "
            placeholder="Select Categories"
            :required="form.category_ids.length === 0"
            multiple
          />
        </div>
        <button
          aria-label="Add category"
          @click="openCategoryModalForTransaction"
          class="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all dark:bg-indigo-900/40 dark:text-indigo-100 dark:hover:bg-indigo-900/60"
        >
          <IconPlus />
        </button>
      </div>

      <!-- Payment Mode -->
      <div class="flex items-end gap-2">
        <div class="flex-1">
          <BaseSearchableSelect
            v-model="form.payment_mode_id"
            label="Payment Mode"
            :options="
              paymentModeStore.paymentModes.map((p) => ({ label: p.name, value: p.id, description: p.description }))
            "
            placeholder="Select Payment Mode"
            required
          />
        </div>
        <button type="button" aria-label="Add payment method"
          @click="showPaymentModeModal = true"
          class="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all dark:bg-indigo-900/40 dark:text-indigo-100 dark:hover:bg-indigo-900/60"
        >
          <IconPlus />
        </button>
      </div>

      <BaseSearchableSelect
        v-model="form.contact_id"
        label="Contact"
        :options="contactStore.contacts.map((c) => ({ label: c.name, value: c.id, description: c.phone }))"
        placeholder="Select Contact"
      />
    </div>

    <!-- Products -->
    <div class="space-y-4 rounded-sm bg-white p-4 shadow-sm dark:bg-gray-900 dark:border dark:border-gray-800">
      <div class="flex items-center justify-between gap-2">
        <button
          type="button"
          :aria-expanded="showProducts"
        @click="showProducts = !showProducts"
          class="flex flex-1 items-center gap-2 text-left"
        >
          <h3 class="font-medium text-gray-900 dark:text-gray-100">Products</h3>
          <span
            v-if="form.products.length > 0"
            class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200"
          >
            {{ form.products.length }}
          </span>
          <IconChevronDown
            class="h-4 w-4 text-gray-400 transition-transform"
            :class="{ 'rotate-180': showProducts }"
          />
        </button>
        <div class="flex gap-2">
          <button type="button" aria-label="Add product"
            @click="openProductModal"
            class="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all dark:bg-indigo-900/40 dark:text-indigo-100 dark:hover:bg-indigo-900/60"
          >
            <IconPlus />
          </button>
        </div>
      </div>

      <p v-if="!showProducts && form.products.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
        No items. The amount above will be saved as the total.
      </p>

      <div v-show="showProducts" class="divide-y divide-gray-100 dark:divide-gray-800">
        <ProductLineItem
          v-for="(p, index) in form.products"
          :key="p.id"
          :model-value="p"
          :products="productStore.products"
          :product-index="index"
          @update:model-value="updateProduct(index, $event)"
          @remove="removeProduct(index)"
        />
        <div v-if="form.products.length === 0" class="text-center text-gray-500 py-4 text-sm dark:text-gray-400">
          No items added.
        </div>
        <div class="pt-2 text-center">
          <button
            @click="addProduct"
            class="w-full text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
          >
            + Add Item
          </button>
        </div>
      </div>
    </div>

    <!-- Discount & Charge (Cash Out Only, and only if products exist) -->
    <div
      v-if="form.type === 'out' && form.products.length > 0"
      class="space-y-4 rounded-sm bg-white p-4 shadow-sm dark:bg-gray-900 dark:border dark:border-gray-800"
    >
      <div class="grid grid-cols-2 gap-4">
        <BaseInput
          v-model="form.discount"
          type="number"
          step="0.01"
          label="Discount"
          placeholder="0.00"
          enterkeyhint="next"
          @input="calculateTotal"
        />

        <BaseInput
          v-model="form.charge"
          type="number"
          step="0.01"
          label="Charge"
          placeholder="0.00"
          enterkeyhint="done"
          @input="calculateTotal"
        />
      </div>
    </div>

    <!-- Description -->
    <div class="rounded-sm bg-white p-4 shadow-sm dark:bg-gray-900 dark:border dark:border-gray-800">
      <BaseInput v-model="form.description" type="textarea" label="Description" placeholder="What is this for?" />
    </div>

    <slot name="after-description" />

    <!-- Add Category Modal -->
    <BaseModal :dismissible="!operationBusy" :show="showCategoryModal" title="Add New Category" z-index="z-[60]" @close="showCategoryModal = false">
      <BaseError :message="operationError" action-label="" />
      <div class="space-y-4">
        <BaseInput v-model="newCategoryName" label="Category Name" placeholder="e.g. Groceries" autoFocus />

        <BaseInput v-model="newCategoryDescription" label="Description" placeholder="Optional" />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" :disabled="operationBusy" @click="showCategoryModal = false">Cancel</BaseButton>
          <BaseButton :loading="operationBusy" @click="saveNewCategory">Add Category</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Add Product Modal -->
    <BaseModal :dismissible="!operationBusy" :show="showProductModal" title="Add New Product" @close="closeProductModal">
      <BaseError :message="operationError" action-label="" />
      <div class="space-y-4 max-h-[70vh] overflow-y-auto">
        <LightGallery :images="newProductAttachments" editable @delete="removeNewProductAttachment" />
        <ImageUpload @upload="handleNewProductUpload" from="products" />

        <BaseInput v-model="newProductName" label="Product Name" placeholder="e.g. Milk" required autoFocus />

        <BaseInput v-model="newProductRate" type="number" label="Rate" required />

        <BaseSearchableSelect
          v-model="newProductQuantityType"
          :options="QUANTITY_TYPES"
          label="Quantity Type"
          placeholder="Select quantity type"
          required
        />

        <div class="flex items-end gap-2">
          <div class="flex-1">
            <BaseSearchableSelect
              v-model="newProductCategoryId"
              label="Category"
              :options="categoryStore.categories.map((c) => ({ label: c.name, value: c.id }))"
              placeholder="Select Category"
            />
          </div>
          <button type="button" aria-label="Add category for product"
            @click="openCategoryModalForProduct"
            class="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all dark:bg-indigo-900/40 dark:text-indigo-100 dark:hover:bg-indigo-900/60"
          >
            <IconPlus />
          </button>
        </div>

        <BaseInput v-model="newProductDescription" label="Description" placeholder="Optional" />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" :disabled="operationBusy" @click="closeProductModal">Cancel</BaseButton>
          <BaseButton :loading="operationBusy" @click="saveNewProduct">Add Product</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Add Payment Mode Modal -->
    <BaseModal :dismissible="!operationBusy" :show="showPaymentModeModal" title="Add New Payment Mode" @close="showPaymentModeModal = false">
      <BaseError :message="operationError" action-label="" />
      <div class="space-y-4">
        <BaseInput
          v-model="newPaymentModeName"
          label="Payment Mode Name"
          placeholder="e.g. Cash, Bank Transfer"
          required
          autoFocus
        />

        <BaseInput v-model="newPaymentModeDescription" label="Description" placeholder="Optional" />

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" :disabled="operationBusy" @click="showPaymentModeModal = false">Cancel</BaseButton>
          <BaseButton :loading="operationBusy" @click="saveNewPaymentMode">Add Payment Mode</BaseButton>
        </div>
      </div>
    </BaseModal>

  </div>
</template>
