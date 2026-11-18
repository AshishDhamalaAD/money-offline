<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { liveQuery } from 'dexie'
import { db } from '@/db/dexie'
import { restoreTrashEntries, purgeExpiredTrash } from '@/services/trash'
import { useSyncStore } from '@/store/syncStore'
import { descriptionToText } from '@/utils/description'
import { formatCurrency } from '@/utils/moneyUtils'
import { formatDateTime } from '@/utils/dateUtils'
import PageLayout from '@/components/layout/PageLayout.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseConfirm from '@/components/common/BaseConfirm.vue'
import SettingsTabs from './components/SettingsTabs.vue'

const bookId = Number(useRoute().params.bookId)
const rows = ref([])
const book = ref(null)
const busy = ref(false)
const message = ref('')
const confirmOpen = ref(false)
const deleteId = ref(null)
const syncStore = useSyncStore()
let subscription
onMounted(async () => {
  await purgeExpiredTrash()
  book.value = await db.books.get(bookId)
  subscription = liveQuery(() => db.trash.where('book_id').equals(bookId).reverse().sortBy('deleted_at'))
    .subscribe({ next: value => rows.value = value, error: error => message.value = error.message })
})
onUnmounted(() => subscription?.unsubscribe())
async function restore(entry) {
  busy.value = true
  try {
    await restoreTrashEntries([entry.id])
    syncStore.scheduleSync()
    message.value = 'Transaction restored.'
  } catch (error) { message.value = error.message }
  finally { busy.value = false }
}
function confirmDelete(id = null) {
  deleteId.value = id
  confirmOpen.value = true
}
async function remove() {
  busy.value = true
  try {
    if (deleteId.value != null) await db.trash.delete(deleteId.value)
    else await db.trash.where('book_id').equals(bookId).delete()
    confirmOpen.value = false
    message.value = 'Trash deleted permanently.'
  } catch (error) { message.value = error.message }
  finally { busy.value = false }
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="book?.name || 'Trash'" :back-route="{ name: 'book-details', params: { id: bookId } }" />
    <main class="space-y-4 p-4">
      <SettingsTabs :book-id="bookId" />
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Trash</h2>
        <BaseButton v-if="rows.length" variant="danger" size="sm" :disabled="busy" @click="confirmDelete()">Empty trash</BaseButton>
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400">Deleted transactions are kept on this device for 30 days. Trash is excluded from backups and sync.</p>
      <p v-if="message" role="status" class="text-sm text-indigo-700 dark:text-indigo-300">{{ message }}</p>
      <p v-if="!rows.length" class="py-8 text-center text-gray-500 dark:text-gray-400">Trash is empty.</p>
      <article v-for="entry in rows" :key="entry.id" class="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex justify-between gap-3 text-sm text-gray-900 dark:text-gray-100">
          <span>{{ formatDateTime(entry.row.date) }}</span>
          <strong>{{ entry.row.type === 'out' ? '-' : '+' }}{{ formatCurrency(entry.row.amount) }}</strong>
        </div>
        <p class="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">{{ descriptionToText(entry.row.description) || 'No description' }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Deleted {{ formatDateTime(new Date(entry.deleted_at)) }}</p>
        <div class="flex flex-wrap gap-2">
          <BaseButton size="sm" :disabled="busy" @click="restore(entry)">Restore</BaseButton>
          <BaseButton size="sm" variant="secondary" :disabled="busy" @click="confirmDelete(entry.id)">Delete forever</BaseButton>
        </div>
      </article>
      <BaseConfirm v-model="confirmOpen" :title="deleteId == null ? 'Empty trash?' : 'Delete forever?'" message="These transactions will no longer be recoverable on this device." confirm-label="Delete forever" variant="danger" :loading="busy" @confirm="remove" />
    </main>
  </PageLayout>
</template>
