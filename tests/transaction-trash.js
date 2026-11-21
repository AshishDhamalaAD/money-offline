import { createApp, h, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import applicationRouter from '/src/router/index.js'
import { db } from '/src/db/dexie.js'
import { useSyncStore } from '/src/store/syncStore.js'
import { enqueueCompressedUpload } from '/src/services/uploadQueue.js'

function check(value, message) { if (!value) throw new Error(message) }
async function waitFor(read, message) {
  for (let i = 0; i < 100; i++) {
    await nextTick()
    if (await read()) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(message)
}
function button(root, label) {
  const element = [...root.querySelectorAll('button')].find(item => item.textContent.trim() === label)
  check(element, `Missing ${label} button`)
  return element
}
function touch(row, type, x) {
  const event = new Event(type, { bubbles: true })
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: x, clientY: 100 }] })
  row.dispatchEvent(event)
}

export async function runTransactionTrashTests() {
  const passed = []
  for (const mode of ['swipe', 'long press', 'edit page']) {
    const pinia = createPinia(); setActivePinia(pinia)
    const sync = useSyncStore()
    sync.online = false
    const bookId = await db.books.add({ name: `Trash ${mode}` })
    const attachment = await enqueueCompressedUpload(new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' }), 'transactions', bookId)
    const original = {
      book_id: bookId, type: 'out', amount: 42, date: '2026-11-20 12:00:00',
      description: `Delete from ${mode}`, category_ids: [], products: [],
      attachments: [attachment], sync_status: 'pending',
    }
    const id = await db.transactions.add(original)
    const router = createRouter({ history: createMemoryHistory(), routes: applicationRouter.options.routes })
    const host = document.createElement('div'); document.body.appendChild(host)
    const errors = []
    const app = createApp({ render: () => h(RouterView) })
    app.config.errorHandler = error => errors.push(error)
    app.use(pinia); app.use(router)
    try {
      await router.push({ name: 'book-details', params: { id: bookId }, query: { filter: 'all' } })
      await router.isReady(); app.mount(host)
      await waitFor(() => host.querySelector('[data-swipe-row]'), `${mode}: transaction card did not load`)
      const row = host.querySelector('[data-swipe-row]')
      if (mode === 'swipe') {
        touch(row, 'touchstart', 200)
        touch(row, 'touchmove', 100)
        touch(row, 'touchend', 100)
        await nextTick()
        check(button(row, 'Delete').parentElement.getAttribute('aria-hidden') === 'false', 'Swipe did not reveal Delete')
        button(row, 'Delete').click()
      } else if (mode === 'long press') {
        touch(row, 'touchstart', 200)
        await waitFor(() => document.querySelector('[role="dialog"]'), 'Long press did not open actions')
        touch(row, 'touchend', 200)
        button(document.querySelector('[role="dialog"]'), 'Delete Transaction').click()
      } else {
        row.querySelector('.relative.flex.items-stretch').click()
        await waitFor(() => host.textContent.includes('Edit Transaction') && host.querySelector('textarea')?.value === original.description, 'Card tap did not load the edit page')
        button(host, 'Delete').click()
        await waitFor(() => document.querySelector('[role="dialog"]')?.textContent.includes('Move this transaction to Trash?'), 'Edit Delete did not explain Trash retention')
        button(document.querySelector('[role="dialog"]'), 'Delete Transaction').click()
      }
      await waitFor(async () => !(await db.transactions.get(id)), `${mode}: active transaction was not removed`)
      const entries = await db.trash.where('[table+record_id]').equals(['transactions', id]).toArray()
      check(entries.length === 1, `${mode}: transaction must have exactly one Trash snapshot`)
      const entry = entries[0]
      check(JSON.stringify(entry.row) === JSON.stringify({ ...original, id }), `${mode}: Trash did not preserve the original transaction`)
      check(entry.book_id === bookId && Date.now() - entry.deleted_at < 10000, `${mode}: Trash retention metadata is missing`)
      check(await db.sync_tombstones.where('[table+record_id]').equals(['transactions', id]).count() === 1, `${mode}: deletion was not queued for sync`)
      check(await db.upload_queue.where('ref').equals(attachment).count() === 1, `${mode}: offline receipt was discarded`)
      if (mode === 'edit page') {
        await waitFor(() => router.currentRoute.value.name === 'book-details', 'Edit Delete did not return to the list')
      } else {
        await waitFor(() => document.querySelector('[role="status"]')?.textContent.includes('moved to Trash'), `${mode}: missing Trash feedback`)
      }
      // Use Book Settings' real restore button, including for the edit-page path
      // which has no Undo snackbar, and verify the receipt survives restoration.
      await router.push({ name: 'book-settings-trash', params: { bookId } })
      await waitFor(() => host.querySelector('article')?.textContent.includes(original.description), `${mode}: deleted transaction is absent from Trash`)
      button(host.querySelector('article'), 'Restore').click()
      await waitFor(async () => await db.transactions.get(id), `${mode}: transaction could not be restored`)
      const restored = await db.transactions.get(id)
      check(restored.amount === original.amount && restored.description === original.description && restored.attachments[0] === attachment, `${mode}: restore lost transaction data`)
      check(!(await db.trash.get(entry.id)), `${mode}: restored snapshot remained in Trash`)
      check(!(await db.sync_tombstones.where('[table+record_id]').equals(['transactions', id]).count()), `${mode}: restore left a pending deletion`)
      check(!errors.length, `${mode}: ${errors.map(error => error.message).join('; ')}`)
      passed.push(`${mode} Delete moves the transaction to Trash offline and Book Settings restores it with its receipt`)
    } finally {
      app.unmount(); host.remove(); sync.stop()
      pinia._s.forEach(store => store.$dispose())
      await db.transactions.where('book_id').equals(bookId).delete()
      await db.trash.where('book_id').equals(bookId).delete()
      await db.sync_tombstones.where('[table+record_id]').equals(['transactions', id]).delete()
      await db.upload_queue.where('ref').equals(attachment).delete()
      await db.books.delete(bookId)
    }
  }
  return passed
}
