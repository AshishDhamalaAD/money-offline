<script setup>
import { ref } from "vue"
import { db } from "../../db"
import { formatDateTimeForDB } from "../../utils/dateUtils"
import BaseButton from "../ui/BaseButton.vue"

const props = defineProps({
  bookId: {
    type: Number,
    required: true,
  },
})

const fileInput = ref(null)
const importing = ref(false)
const importStatus = ref("")
const error = ref("")

async function handleImport() {
  const file = fileInput.value.files[0]
  if (!file) {
    error.value = "Please select a file to import."
    return
  }

  importing.value = true
  importStatus.value = "Reading file..."
  error.value = ""

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const json = JSON.parse(e.target.result)
      await processData(json)
      importStatus.value = "Import completed successfully!"
      fileInput.value.value = "" // Reset input
    } catch (e) {
      console.error(e)
      error.value = "Failed to parse or import data: " + e.message
    } finally {
      importing.value = false
    }
  }
  reader.onerror = () => {
    error.value = "Failed to read file."
    importing.value = false
  }
  reader.readAsText(file)
}

async function processData(json) {
  if (!json.data || !json.data.transactions) {
    throw new Error("Invalid JSON format: missing data.transactions")
  }

  const transactions = json.data.transactions
  const total = transactions.length
  let processed = 0

  // Mappings: Name -> ID
  const contactMap = new Map()
  const categoryMap = new Map()
  const paymentModeMap = new Map()
  const productMap = new Map()

  // Helper to get or create Contact
  async function getOrCreateContact(contactData) {
    if (!contactData || !contactData.name) return null
    const name = contactData.name.trim()
    if (contactMap.has(name)) return contactMap.get(name)

    // Check DB
    let contact = await db.contacts.where("name").equals(name).first()
    if (!contact) {
      const id = await db.contacts.add({
        name: name,
        phone: contactData.phone || null,
        created_at: formatDateTimeForDB(),
        updated_at: formatDateTimeForDB(),
        sync_status: "pending",
      })
      contact = { id, name }
    }
    contactMap.set(name, contact.id)
    return contact.id
  }

  // Helper to get or create Category
  async function getOrCreateCategory(categoryData) {
    if (!categoryData || !categoryData.name) return null
    const name = categoryData.name.trim()
    if (categoryMap.has(name)) return categoryMap.get(name)

    // Check DB for this book
    let category = await db.categories
      .where("book_id")
      .equals(props.bookId)
      .and((c) => c.name === name)
      .first()

    if (!category) {
      const id = await db.categories.add({
        name: name,
        book_id: props.bookId,
        description: "",
        created_at: formatDateTimeForDB(),
        updated_at: formatDateTimeForDB(),
        sync_status: "pending",
      })
      category = { id, name }
    }
    categoryMap.set(name, category.id)
    return category.id
  }

  // Helper to get or create Payment Mode
  async function getOrCreatePaymentMode(pmData) {
    if (!pmData || !pmData.name) return null
    const name = pmData.name.trim()
    if (paymentModeMap.has(name)) return paymentModeMap.get(name)

    // Check DB for this book
    let pm = await db.payment_modes
      .where("book_id")
      .equals(props.bookId)
      .and((p) => p.name === name)
      .first()

    if (!pm) {
      const id = await db.payment_modes.add({
        name: name,
        book_id: props.bookId,
        type: "custom", // Default type
        description: "",
        created_at: formatDateTimeForDB(),
        updated_at: formatDateTimeForDB(),
        sync_status: "pending",
      })
      pm = { id, name }
    }
    paymentModeMap.set(name, pm.id)
    return pm.id
  }

  // Helper to get or create Product
  async function getOrCreateProduct(productData) {
    if (!productData || !productData.name) return null
    const name = productData.name.trim()
    if (productMap.has(name)) return productMap.get(name)

    // Check DB for this book
    let product = await db.products
      .where("book_id")
      .equals(props.bookId)
      .and((p) => p.name === name)
      .first()

    if (!product) {
      // Handle product category if present
      let categoryId = null
      if (productData.category) {
        categoryId = await getOrCreateCategory(productData.category)
      }

      const id = await db.products.add({
        name: name,
        rate: parseFloat(productData.rate) || 0,
        description: "",
        quantity_type: "pcs", // Default
        book_id: props.bookId,
        category_id: categoryId,
        created_at: formatDateTimeForDB(),
        updated_at: formatDateTimeForDB(),
        sync_status: "pending",
      })
      product = { id, name }
    }
    productMap.set(name, product.id)
    return product.id
  }

  // Process Transactions
  for (const tx of transactions) {
    importStatus.value = `Processing transaction ${processed + 1} of ${total}...`

    // 1. Contact
    const contactId = await getOrCreateContact(tx.contact)

    // 2. Payment Mode
    const paymentModeId = await getOrCreatePaymentMode(tx.payment_mode)

    // 3. Categories (Transaction Level)
    const categoryIds = []
    if (tx.categories && Array.isArray(tx.categories)) {
      for (const cat of tx.categories) {
        const catId = await getOrCreateCategory(cat)
        if (catId) categoryIds.push(catId)
      }
    }

    // 4. Products
    const products = []
    if (tx.products && Array.isArray(tx.products)) {
      for (const p of tx.products) {
        const productId = await getOrCreateProduct(p)
        if (productId) {
          products.push({
            id: Date.now() + Math.random(), // Temp ID for UI
            product_id: productId,
            name: p.name,
            quantity: parseFloat(p.quantity) || 1,
            rate: parseFloat(p.rate) || 0,
            amount: parseFloat(p.amount) || 0,
          })
        }
      }
    }

    // 5. Create Transaction
    await db.transactions.add({
      book_id: props.bookId,
      type: tx.type,
      date: tx.date, // Assuming format matches or is compatible
      amount: parseFloat(tx.amount) || 0,
      discount: parseFloat(tx.discount) || 0,
      charge: parseFloat(tx.charge) || 0,
      description: tx.description || "",
      contact_id: contactId,
      payment_mode_id: paymentModeId,
      category_ids: categoryIds,
      products: products,
      created_at: tx.created_at || formatDateTimeForDB(),
      updated_at: tx.updated_at || formatDateTimeForDB(),
      sync_status: "pending",
    })

    processed++
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="bg-blue-50 border border-blue-100 rounded-sm p-4">
      <h3 class="font-medium text-blue-800">Legacy Data Import</h3>
      <p class="text-sm text-blue-600 mt-1">
        Import data from the old JSON format. This will create missing contacts, categories, payment modes, and
        products.
      </p>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Select JSON File</label>
        <input
          type="file"
          ref="fileInput"
          accept=".json"
          class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
      </div>

      <div v-if="error" class="text-red-600 text-sm">
        {{ error }}
      </div>

      <div v-if="importStatus" class="text-indigo-600 text-sm font-medium">
        {{ importStatus }}
      </div>

      <BaseButton :loading="importing" @click="handleImport"> Import Data </BaseButton>
    </div>
  </div>
</template>
