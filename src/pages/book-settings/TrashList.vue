<script setup>
import { ref, onMounted, onUnmounted, defineAsyncComponent, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLiveResource } from '@/composables/useLiveResource'
import { usePageFeedback } from '@/composables/usePageFeedback'
import BaseError from '@/components/common/BaseError.vue'
import ResourceState from '@/components/common/ResourceState.vue'
import { describeTrashEntries } from '@/services/trashDetails'
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

const LightGallery = defineAsyncComponent(() => import('@/components/common/LightGallery.vue'))

const bookId = Number(useRoute().params.bookId)
const resource = reactive(useLiveResource([], 'Could not load Trash.'))
const rows = computed(() => resource.data)
const { operationError, operationAction, retryOperation, runOperation } = usePageFeedback()
const book = ref(null)
const busy = ref(false)
const message = ref('')
const confirmOpen = ref(false)
const deleteId = ref(null)
const syncStore = useSyncStore()
onMounted(() => runOperation(async () => {
    await purgeExpiredTrash()
    book.value = await db.books.get(bookId)
    resource.start(async () => describeTrashEntries(
      await db.trash.where('book_id').equals(bookId).reverse().sortBy('deleted_at'),
    ), bookId)
  }, 'Could not load Trash.', true))
async function restore(entry) {
  busy.value = true
  try {
    await restoreTrashEntries([entry.id])
    syncStore.scheduleSync()
    message.value = 'Transaction restored.'
  } catch (error) { console.error('Trash action failed', error); operationError.value = 'Could not finish this Trash action. Review your records before trying again.' }
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
  } catch (error) { console.error('Trash action failed', error); operationError.value = 'Could not finish this Trash action. Review your records before trying again.' }
  finally { busy.value = false }
}
</script>

<template>
  <PageLayout>
    <PageHeader :title="book?.name || 'Trash'" :back-route="{ name: 'book-details', params: { id: bookId } }" />
    <main class="space-y-4 p-4">
      <SettingsTabs :book-id="bookId" />
      <BaseError :message="operationError" :action-label="operationAction" @retry="retryOperation" />
      <ResourceState :resources="[resource]" />
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Trash</h2>
        <BaseButton v-if="rows.length" variant="danger" size="sm" :disabled="busy" @click="confirmDelete()">Empty trash</BaseButton>
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400">Deleted transactions are kept on this device for 30 days. Trash is excluded from backups and sync.</p>
      <p v-if="message" role="status" class="text-sm text-indigo-700 dark:text-indigo-300">{{ message }}</p>
      <p v-if="resource.ready && !resource.error && !rows.length" class="py-8 text-center text-gray-500 dark:text-gray-400">Trash is empty.</p>
      <article v-for="entry in rows" :key="entry.id" class="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-start justify-between gap-3 text-sm text-gray-900 dark:text-gray-100">
          <span>{{ formatDateTime(entry.row.date) }}</span>
          <strong class="shrink-0">{{ entry.row.type === 'out' ? '-' : '+' }}{{ formatCurrency(entry.row.amount) }}</strong>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <span class="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">{{ entry.row.type === 'in' ? 'Cash in' : 'Cash out' }}</span>
          <span v-for="category in entry.details.categories" :key="category" class="rounded-full bg-indigo-50 px-2 py-1 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">{{ category }}</span>
        </div>
        <ul v-if="entry.row.products?.length" class="space-y-3 border-y border-gray-100 py-3 dark:border-gray-800" aria-label="Transaction items">
          <li v-for="(item, index) in entry.row.products" :key="index" class="flex items-start justify-between gap-3 text-sm">
            <div class="min-w-0">
              <p class="break-words font-medium text-gray-900 dark:text-gray-100">{{ entry.details.productNames[index] }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatCurrency(item.quantity ?? 1) }} x {{ formatCurrency(item.rate) }}</p>
            </div>
            <span class="shrink-0 font-medium text-gray-900 dark:text-gray-100">{{ formatCurrency(item.amount) }}</span>
          </li>
        </ul>
        <p v-if="descriptionToText(entry.row.description)" class="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">{{ descriptionToText(entry.row.description) }}</p>
        <dl class="space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <div v-if="entry.details.contact" class="flex flex-wrap gap-x-2"><dt>Contact:</dt><dd class="break-words font-medium">{{ entry.details.contact }}</dd></div>
          <div v-if="entry.details.paymentMode" class="flex flex-wrap gap-x-2"><dt>Payment:</dt><dd class="break-words font-medium">{{ entry.details.paymentMode }}</dd></div>
          <div v-if="Number(entry.row.discount)" class="flex justify-between gap-3"><dt>Discount</dt><dd>{{ formatCurrency(entry.row.discount) }}</dd></div>
          <div v-if="Number(entry.row.charge)" class="flex justify-between gap-3"><dt>Charge</dt><dd>{{ formatCurrency(entry.row.charge) }}</dd></div>
        </dl>
        <LightGallery v-if="entry.row.attachments?.length" :images="entry.row.attachments" />
        <p v-if="!entry.row.products?.length && !descriptionToText(entry.row.description) && !entry.details.categories.length && !entry.details.contact && !entry.details.paymentMode && !entry.row.attachments?.length" class="text-sm text-gray-500 dark:text-gray-400">No items or additional details were recorded.</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Deleted {{ formatDateTime(new Date(entry.deleted_at)) }}</p>
        <div class="flex flex-wrap gap-2">
          <BaseButton size="sm" :disabled="busy" @click="restore(entry)">Restore</BaseButton>
          <BaseButton size="sm" variant="secondary" :disabled="busy" @click="confirmDelete(entry.id)">Delete forever</BaseButton>
        </div>
      </article>
      <BaseConfirm v-model="confirmOpen" :title="deleteId == null ? 'Empty trash?' : 'Delete forever?'" message="These transactions will no longer be recoverable on this device." confirm-label="Delete forever" variant="danger" :loading="busy" @confirm="remove">
        <BaseError :message="operationError" action-label="" />
      </BaseConfirm>
    </main>
  </PageLayout>
</template>
