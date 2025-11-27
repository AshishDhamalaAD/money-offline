<script setup>
import { ref } from "vue"
import { importProductRates } from "../../utils/migrationUtils"
import BaseButton from "../ui/BaseButton.vue"

const textInput = ref("")
const importing = ref(false)
const status = ref("")
const error = ref("")

async function handleImport() {
  if (!textInput.value.trim()) {
    error.value = "Please paste the data first."
    return
  }

  importing.value = true
  status.value = "Processing..."
  error.value = ""

  try {
    const count = await importProductRates()
    status.value = `Successfully imported ${count} rate history records.`
    textInput.value = ""
  } catch (e) {
    console.error(e)
    error.value = "Failed to import: " + e.message
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="bg-yellow-50 border border-yellow-100 rounded-sm p-4">
      <h3 class="font-medium text-yellow-800">Import Product Rate History</h3>
      <p class="text-sm text-yellow-600 mt-1">
        Paste the legacy rate history data string below. Format: {[product_id: 1, rate: 100, ...], ...}
      </p>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Data String</label>
        <textarea
          v-model="textInput"
          rows="6"
          class="block w-full rounded-sm border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="{[product_id: ...], ...}"
        ></textarea>
      </div>

      <div v-if="error" class="text-red-600 text-sm">
        {{ error }}
      </div>

      <div v-if="status" class="text-green-600 text-sm font-medium">
        {{ status }}
      </div>

      <BaseButton :loading="importing" @click="handleImport"> Import History </BaseButton>
    </div>
  </div>
</template>
