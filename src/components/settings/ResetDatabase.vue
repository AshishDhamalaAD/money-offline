<script setup>
import { ref } from "vue"
import { db } from "../../db"
import BaseButton from "../ui/BaseButton.vue"
import Modal from "../ui/Modal.vue"

const showResetModal = ref(false)
const resetting = ref(false)

async function resetDatabase() {
  resetting.value = true
  try {
    await db.delete()
    window.location.reload()
  } catch (e) {
    console.error("Failed to reset database:", e)
    alert("Failed to reset database")
    resetting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-red-600">Danger Zone</h2>
    <div class="bg-red-50 border border-red-100 rounded-sm p-4">
      <div class="">
        <div>
          <h3 class="font-medium text-red-800">Reset Database</h3>
          <p class="text-sm text-red-600 mt-1">
            This will permanently delete all your data. This action cannot be undone.
          </p>
        </div>
        <BaseButton variant="danger" class="mt-4" @click="showResetModal = true"> Reset Database </BaseButton>
      </div>
    </div>

    <!-- Reset Confirmation Modal -->
    <Modal :show="showResetModal" title="Reset Database" @close="showResetModal = false">
      <div class="space-y-4">
        <p class="text-gray-600">
          Are you sure you want to reset the database? This will wipe all your data including books, transactions,
          contacts, and settings.
        </p>

        <div class="bg-red-50 border border-red-200 rounded-lg p-3">
          <p class="text-sm text-red-800"><strong>Warning:</strong> This action is irreversible!</p>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="showResetModal = false">Cancel</BaseButton>
          <BaseButton variant="danger" :loading="resetting" @click="resetDatabase">Yes, Reset Everything</BaseButton>
        </div>
      </div>
    </Modal>
  </div>
</template>
