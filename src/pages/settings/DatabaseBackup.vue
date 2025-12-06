<script setup>
import { ref } from "vue"

import { db } from "@/db/dexie"
import { useDatabaseExport } from "@/composables/useDatabaseExport"
import BaseButton from "@/components/common/BaseButton.vue"
import Modal from "@/components/common/BaseModal.vue"

const { getDatabaseDump } = useDatabaseExport()

// Export/Import state
const isExporting = ref(false)
const isImporting = ref(false)
const exportProgress = ref(0)
const importProgress = ref(0)
const importError = ref("")
const showImportModal = ref(false)
const selectedFile = ref(null)
const fileInput = ref(null)

async function exportDatabase() {
  isExporting.value = true
  exportProgress.value = 0

  try {
    const exportData = await getDatabaseDump((progress) => {
      exportProgress.value = progress
    })

    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expense-tracker-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportProgress.value = 100
    setTimeout(() => {
      isExporting.value = false
      exportProgress.value = 0
    }, 1000)
  } catch (error) {
    console.error("Export failed:", error)
    alert("Failed to export database: " + error.message)
    isExporting.value = false
    exportProgress.value = 0
  }
}

function openImportDialog() {
  importError.value = ""
  selectedFile.value = null
  showImportModal.value = true
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    importError.value = ""
  }
}

function cancelImport() {
  showImportModal.value = false
  selectedFile.value = null
  importError.value = ""
  if (fileInput.value) {
    fileInput.value.value = ""
  }
}

async function startImport() {
  if (!selectedFile.value) {
    importError.value = "Please select a file first"
    return
  }

  isImporting.value = true
  importProgress.value = 0
  importError.value = ""

  try {
    const text = await selectedFile.value.text()
    const importData = JSON.parse(text)

    // Validate import data
    if (!importData.version || !importData.data) {
      throw new Error("Invalid backup file format")
    }

    const tables = Object.keys(importData.data)
    const totalTables = tables.length

    // Clear existing data and import
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i]
      importProgress.value = Math.round(((i + 1) / totalTables) * 100)

      if (db[tableName]) {
        // Clear existing data
        await db[tableName].clear()

        // Import new data
        const records = importData.data[tableName]
        if (records && records.length > 0) {
          await db[tableName].bulkAdd(records)
        }
      }

      // Small delay to show progress
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    importProgress.value = 100

    setTimeout(() => {
      isImporting.value = false
      importProgress.value = 0
      showImportModal.value = false
      selectedFile.value = null
      alert("Database imported successfully! The page will reload.")
      window.location.reload()
    }, 1000)
  } catch (error) {
    importError.value = "Failed to import database: " + error.message
    isImporting.value = false
    importProgress.value = 0
  }
}
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Database Backup & Restore</h2>

    <div class="bg-white rounded-sm p-4 shadow-sm space-y-4 border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      <!-- Export Section -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-gray-100">Export Database</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Download all your data as a backup file</p>
          </div>
          <BaseButton @click="exportDatabase" :disabled="isExporting" size="sm">
            <span v-if="isExporting" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Exporting...
            </span>
            <span v-else>Export</span>
          </BaseButton>
        </div>

        <!-- Export Progress -->
        <div v-if="isExporting" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-300">Exporting data...</span>
            <span class="font-medium text-indigo-600 dark:text-indigo-300">{{ exportProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div
              class="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: exportProgress + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-200 dark:border-gray-800"></div>

      <!-- Import Section -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-gray-100">Import Database</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Restore data from a backup file</p>
          </div>
          <BaseButton @click="openImportDialog" :disabled="isImporting" variant="secondary" size="sm">
            <span v-if="isImporting" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Importing...
            </span>
            <span v-else>Import</span>
          </BaseButton>
        </div>
      </div>

      <div class="bg-yellow-50 border border-yellow-200 rounded-sm p-3 dark:bg-yellow-900/30 dark:border-yellow-800">
        <p class="text-xs text-yellow-800 dark:text-yellow-100">
          <strong>Warning:</strong> Importing will replace all existing data. Make sure to export your current data
          first!
        </p>
      </div>
    </div>

    <!-- Import Modal -->
    <Modal :show="showImportModal" title="Import Database" @close="cancelImport">
      <div class="space-y-4">
        <p class="text-gray-600 dark:text-gray-300">Select a backup file to import. This will replace all existing data.</p>

        <div class="bg-red-50 border border-red-200 rounded-sm p-3 dark:bg-red-900/40 dark:border-red-800">
          <p class="text-sm text-red-800 dark:text-red-100">
            <strong>Warning:</strong> This action cannot be undone. All current data will be permanently replaced.
          </p>
        </div>

        <!-- File Input -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Select Backup File</label>
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            @change="handleFileSelect"
            class="block py-2 px-3 w-full text-sm text-gray-900 border border-gray-300 rounded-sm cursor-pointer bg-gray-50 focus:outline-none dark:text-gray-100 dark:border-gray-700 dark:bg-gray-900"
          />
          <p v-if="selectedFile" class="text-sm text-green-600 dark:text-green-400">✓ Selected: {{ selectedFile.name }}</p>
        </div>

        <!-- Import Progress -->
        <div v-if="isImporting" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-300">Importing data...</span>
            <span class="font-medium text-indigo-600 dark:text-indigo-300">{{ importProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div
              class="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: importProgress + '%' }"
            ></div>
          </div>
        </div>

        <!-- Import Error -->
        <div v-if="importError" class="text-sm text-red-600 bg-red-50 p-3 rounded-sm dark:bg-red-900/40 dark:text-red-200">
          {{ importError }}
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="ghost" @click="cancelImport" :disabled="isImporting"> Cancel </BaseButton>
          <BaseButton variant="danger" @click="startImport" :disabled="!selectedFile || isImporting">
            <span v-if="isImporting" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Importing...
            </span>
            <span v-else>Start Import</span>
          </BaseButton>
        </div>
      </div>
    </Modal>
  </div>
</template>
