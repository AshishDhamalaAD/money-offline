<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"

import { useBookStore } from "@/store/bookStore"
import { useDataExport, canShareFiles } from "@/composables/useDataExport"
import BaseButton from "@/components/common/BaseButton.vue"
import BaseSelect from "@/components/common/BaseSelect.vue"
import BaseToast from "@/components/common/BaseToast.vue"

const bookStore = useBookStore()
const { books } = storeToRefs(bookStore)
const { buildCsvFile, buildPdfFile, countTransactions, shareOrDownload, download } = useDataExport()

const selectedBookId = ref("all")
const busy = ref("")
const transactionCount = ref(null)
const shareSupported = ref(false)

const toast = ref({ show: false, message: "", type: "success" })

function showToast(message, type = "success") {
  toast.value = { show: false, message, type }
  setTimeout(() => {
    toast.value = { ...toast.value, show: true }
  }, 0)
}

const bookOptions = computed(() => [
  { label: "All books", value: "all" },
  ...books.value.map((book) => ({ label: book.name, value: book.id })),
])

async function refreshCount() {
  try {
    transactionCount.value = await countTransactions(selectedBookId.value)
  } catch (error) {
    console.error("Could not count transactions:", error)
    transactionCount.value = null
  }
}

onMounted(() => {
  shareSupported.value = canShareFiles()
  refreshCount()
})

watch(selectedBookId, refreshCount)

async function run(format, mode) {
  if (busy.value) return

  busy.value = `${format}-${mode}`

  try {
    const file = format === "csv" ? await buildCsvFile(selectedBookId.value) : await buildPdfFile(selectedBookId.value)

    if (mode === "share") {
      const result = await shareOrDownload(file)

      if (result === "shared") showToast(`${file.name} shared.`)
      else if (result === "downloaded") showToast("Sharing is not available here, so the file was downloaded.")
    } else {
      download(file)
      showToast(`${file.name} downloaded.`)
    }
  } catch (error) {
    console.error("Export failed:", error)
    showToast(`Could not create the export: ${error.message}`, "error")
  } finally {
    busy.value = ""
  }
}
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Export Data</h2>

    <div class="space-y-4 rounded-sm border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Take your transactions with you as a spreadsheet or a printable statement.
      </p>

      <BaseSelect v-model="selectedBookId" label="Book" :options="bookOptions" />

      <p v-if="transactionCount !== null" class="text-xs text-gray-500 dark:text-gray-400">
        {{ transactionCount }} transaction{{ transactionCount === 1 ? "" : "s" }} in this export.
      </p>

      <!-- CSV -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div class="space-y-1">
          <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">CSV</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Every transaction in a spreadsheet.</p>
        </div>

        <div class="flex shrink-0 gap-2">
          <BaseButton
            v-if="shareSupported"
            size="sm"
            :loading="busy === 'csv-share'"
            :disabled="!!busy"
            @click="run('csv', 'share')"
          >
            Share
          </BaseButton>
          <BaseButton
            size="sm"
            :variant="shareSupported ? 'secondary' : 'primary'"
            :loading="busy === 'csv-download'"
            :disabled="!!busy"
            @click="run('csv', 'download')"
          >
            Download
          </BaseButton>
        </div>
      </div>

      <!-- PDF -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div class="space-y-1">
          <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">PDF</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">A printable statement with totals.</p>
        </div>

        <div class="flex shrink-0 gap-2">
          <BaseButton
            v-if="shareSupported"
            size="sm"
            :loading="busy === 'pdf-share'"
            :disabled="!!busy"
            @click="run('pdf', 'share')"
          >
            Share
          </BaseButton>
          <BaseButton
            size="sm"
            :variant="shareSupported ? 'secondary' : 'primary'"
            :loading="busy === 'pdf-download'"
            :disabled="!!busy"
            @click="run('pdf', 'download')"
          >
            Download
          </BaseButton>
        </div>
      </div>
    </div>

    <BaseToast :show="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>
