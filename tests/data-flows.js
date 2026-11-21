import { describeTrashEntries } from '/src/services/trashDetails.js'
import { createApp, nextTick } from 'vue'
import { getActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import TrashList from '/src/pages/book-settings/TrashList.vue'
import '/src/assets/styles/base.css'
import Dexie from 'dexie'
import { ungzip } from 'pako'
import { db } from '/src/db/dexie.js'
import { createPinia, setActivePinia } from 'pinia'
import { getApiToken, migrateSecrets, verifyPin } from '/src/utils/secureStore.js'
import { useSettingsStore } from '/src/store/settingsStore.js'
import { descriptionToText } from '/src/utils/description.js'
import { enqueueCompressedUpload, processQueue, discardQueuedUploads, countLocalAttachmentRefs, resolveAttachmentRefs } from '/src/services/uploadQueue.js'
import { localAttachmentUrl, hydrateLocalAttachments, releaseAttachmentBlob } from '/src/utils/attachmentUrl.js'
import { trashTransactions, restoreTrashEntries, purgeExpiredTrash } from '/src/services/trash.js'
import { useBookStore } from '/src/store/bookStore.js'
import { runSync } from '/src/db/sync/engine.js'
import { useDatabaseExport } from '/src/composables/useDatabaseExport.js'
import { runBackupHealthTests } from './backup-health.js'
import { runAccessibilityTests } from './accessibility.js'
import { runAccessibilityRouteTests } from './accessibility-routes.js'
import { runTransactionTrashTests } from './transaction-trash.js'

function check(value, message) { if (!value) throw new Error(message) }
export async function runDataTests() {
  await db.delete()
  const legacy = new Dexie('ExpenseTrackerDB')
  legacy.version(13).stores({
    books: '++id, name, created_at, updated_at, sync_status',
    transactions: '++id, book_id, type, date, *category_ids, contact_id, payment_mode_id, discount, charge, amount, created_at, updated_at, sync_status, attachments, [book_id+date]',
    categories: '++id, name, book_id, description, sync_status, sort, created_at, updated_at',
    contacts: '++id, name, phone, sync_status, sort, created_at, updated_at',
    payment_modes: '++id, name, description, book_id, sync_status, created_at, updated_at',
    products: '++id, name, rate, description, quantity_type, book_id, category_id, sync_status, created_at, updated_at, attachments',
    settings: 'key, value', product_rates: '++id, product_id, rate, created_at, updated_at, sync_status',
    recurring_transactions: '++id, book_id, active, next_due_date, sync_status', budgets: '++id, book_id, category_id, sync_status',
    sync_tombstones: '++id, table, record_id, deleted_at, [table+record_id]', sync_state: 'key',
  })
  await legacy.open()
  const legacyId = await legacy.table('transactions').add({ description: '<p>Legacy &amp; safe</p>', sync_status: 'synced' })
  legacy.close()
  await db.open()
  check((await db.transactions.get(legacyId)).description === 'Legacy & safe', 'v13 description migration failed')
  check((await db.transactions.get(legacyId)).sync_status === 'synced', 'cosmetic migration dirtied data')
  await db.transactions.delete(legacyId)
  setActivePinia(createPinia())
  const passed = []
  await db.settings.bulkPut([
    { key: 'pinCode', value: '123456' }, { key: 'pinEnabled', value: true },
    { key: 'apiToken', value: 'test-secret' }, { key: 'apiEndpoint', value: 'https://test.invalid' },
  ])
  await Promise.all([migrateSecrets(), getApiToken(), migrateSecrets()])
  check(!(await db.settings.get('pinCode')) && !(await db.settings.get('apiToken')), 'plaintext secrets remain')
  check((await db.settings.get('pinHash')).value.iterations === 210000, 'wrong PIN parameters')
  check(!(await db.settings.get('tokenKey')).value.extractable, 'extractable encryption key')
  check(await verifyPin('123456') && !(await verifyPin('000000')), 'PIN verification failed')
  await db.close(); await db.open()
  check(await getApiToken() === 'test-secret', 'token cannot decrypt after reopen')
  const settings = useSettingsStore()
  await settings.init()
  const beforeToken = JSON.stringify((await db.settings.get('apiTokenEnc')).value)
  await settings.saveSettings('https://test.invalid', 'test-secret')
  check(beforeToken === JSON.stringify((await db.settings.get('apiTokenEnc')).value), 'unchanged token rewritten')
  for (let i = 0; i < 5; i++) check(!(await settings.verifyPinCode('000000')), 'wrong PIN accepted')
  const until = settings.pinLockout.until
  check(until > Date.now() && !(await settings.verifyPinCode('123456')), 'lockout bypassed')
  setActivePinia(createPinia())
  const reloaded = useSettingsStore(); await reloaded.init()
  check(reloaded.pinLockout.until === until, 'lockout not persisted')
  await db.settings.put({ key: 'pinLockout', value: { failures: 0, level: 1, until: 0 } })
  for (let i = 0; i < 5; i++) await reloaded.verifyPinCode('000000')
  check(reloaded.pinLockout.until > Date.now() + 58000, 'lockout did not double')
  await db.settings.put({ key: 'pinLockout', value: { failures: 0, level: 1, until: 0 } })
  check(await reloaded.verifyPinCode('123456') && reloaded.pinLockout.level === 0, 'success did not reset lockout')
  passed.push('secret migration, encryption reload, PIN lockout persistence and escalation')

  check(descriptionToText('<p>Lunch &amp; tea</p><div>Next<br>line</div><script>window.bad=1</script><img src=x onerror=bad()>') === 'Lunch & tea\nNext\nline', 'description sanitisation')
  check(descriptionToText('  2 < 3 & literal &amp;  ') === '  2 < 3 & literal &amp;  ', 'plain text changed')
  passed.push('legacy HTML becomes text while plain descriptions remain unchanged')

  const bookId = await db.books.add({ name: 'Test book', sync_status: 'pending' })
  const blob = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
  const local = await enqueueCompressedUpload(blob, 'transactions', bookId)
  const txId = await db.transactions.add({ book_id: bookId, description: 'Receipt', amount: 25, date: '2026-11-18 12:00:00', attachments: [local], sync_status: 'pending' })
  releaseAttachmentBlob(local)
  await db.close(); await db.open(); await hydrateLocalAttachments()
  check(localAttachmentUrl(local).startsWith('blob:'), 'offline thumbnail did not survive reopen')
  let requests = 0
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { requests++; return new Response(JSON.stringify({ url: 'receipts/photo.jpg' }), { status: 200 }) }
  check(!(await runSync()).success && requests === 0, 'sync sent a local ref')
  const [one, two] = await Promise.all([processQueue(), processQueue()])
  check(one.uploaded === 1 && two.uploaded === 1 && requests === 1, 'queue duplicated uploads')
  check((await db.transactions.get(txId)).attachments[0] === 'receipts/photo.jpg', 'ref not replaced')
  check((await resolveAttachmentRefs([local]))[0] === 'receipts/photo.jpg', 'open form ref not resolved')
  // Recover a local ref saved just after the upload completed.
  await db.transactions.update(txId, { attachments: [local] }); await processQueue()
  check(await countLocalAttachmentRefs() === 0, 'completed queue ref not reconciled')
  const failed = await enqueueCompressedUpload(blob, 'transactions', bookId)
  await db.transactions.update(txId, { attachments: [failed] })
  globalThis.fetch = async () => new Response('', { status: 401 })
  await processQueue()
  check((await db.upload_queue.where('ref').equals(failed).first()).status === 'failed', '401 not permanent')
  await discardQueuedUploads([failed])
  check((await db.transactions.get(txId)).attachments.length === 0, 'discard left a dangling ref')
  for (let i = 0; i < 20; i++) await enqueueCompressedUpload(blob, 'products', bookId)
  let capped = false
  try { await enqueueCompressedUpload(blob, 'products', bookId) } catch { capped = true }
  check(capped, 'photo count cap missing')
  await db.upload_queue.clear()
  await db.upload_queue.add({ ref: 'local:large', size: 40 * 1024 * 1024, status: 'queued' })
  capped = false
  try { await enqueueCompressedUpload(blob, 'products', bookId) } catch { capped = true }
  check(capped, 'photo size cap missing')
  await db.upload_queue.clear()
  globalThis.fetch = originalFetch
  passed.push('offline thumbnail reload, upload single flight, sync guard, ref recovery, permanent errors, discard and queue caps')

  await trashTransactions([txId])
  let entry = await db.trash.where('book_id').equals(bookId).first()
  check(entry && !(await db.transactions.get(txId)), 'delete not snapshotted')
  const [sameId] = await restoreTrashEntries([entry.id])
  check(sameId === txId && !(await db.sync_tombstones.count()), 'pending delete did not restore original id')
  // The default full-backup protocol must keep working with an encrypted token.
  globalThis.fetch = async (url, options) => {
    check(options.headers['X-TOKEN'] === 'test-secret', 'sync did not decrypt token')
    const dumpFile = options.body.get('file')
    const uploaded = JSON.parse(new TextDecoder().decode(ungzip(new Uint8Array(await dumpFile.arrayBuffer()))))
    check(!uploaded.data.trash && !uploaded.data.settings && !uploaded.data.upload_queue, 'sync leaked local tables')
    return new Response('{}', { status: 200 })
  }
  const synced = await runSync()
  check(synced.success, `default full-backup sync failed: ${synced.message}`)
  globalThis.fetch = originalFetch
  await trashTransactions([txId])
  entry = await db.trash.where('book_id').equals(bookId).first()
  await db.sync_tombstones.clear()
  const [newId] = await restoreTrashEntries([entry.id])
  check(newId !== txId && await db.transactions.get(newId), 'synced delete reused original id')
  await trashTransactions([newId])
  entry = await db.trash.where('book_id').equals(bookId).first()
  await db.trash.update(entry.id, { delete_attempted: true })
  const [uncertainId] = await restoreTrashEntries([entry.id])
  check(uncertainId !== newId, 'uncertain network delete reused original id')
  check(await db.sync_tombstones.where('[table+record_id]').equals(['transactions', newId]).count(), 'uncertain delete lost its original tombstone')
  await trashTransactions([uncertainId])
  entry = await db.trash.where('book_id').equals(bookId).first()
  await db.trash.update(entry.id, { deleted_at: Date.now() - 31 * 86400000 })
  await purgeExpiredTrash()
  check(!(await db.trash.count()), 'expired trash retained')
  const photo = await enqueueCompressedUpload(blob, 'transactions', bookId)
  const id = await db.transactions.add({ book_id: bookId, attachments: [photo], amount: 2 })
  await trashTransactions([id])
  const categoryId = await db.categories.add({ book_id: bookId, name: 'Groceries' })
  const productId = await db.products.add({ book_id: bookId, name: 'Rice' })
  const contactId = await db.contacts.add({ name: 'Corner shop' })
  const paymentId = await db.payment_modes.add({ book_id: bookId, name: 'Cash' })
  const detailsId = await db.transactions.add({
    book_id: bookId, type: 'out', amount: 120, description: '', date: '2026-11-18 11:59:00',
    category_ids: [categoryId], contact_id: contactId, payment_mode_id: paymentId,
    products: [{ product_id: productId, quantity: 2, rate: 60, amount: 120 }], attachments: [],
  })
  await trashTransactions([detailsId])
  const detailedEntry = await db.trash.where('[table+record_id]').equals(['transactions', detailsId]).first()
  check(detailedEntry.details.productNames[0] === 'Rice', 'Trash snapshot omitted product name')
  check(!detailedEntry.row.products[0].name, 'display metadata changed the original row')
  const legacyEntry = { ...detailedEntry }; delete legacyEntry.details
  check((await describeTrashEntries([legacyEntry]))[0].details.productNames[0] === 'Rice', 'older Trash entries do not resolve product references')
  await db.products.update(productId, { name: 'Renamed product' })
  check((await describeTrashEntries([detailedEntry]))[0].details.productNames[0] === 'Rice', 'renaming product changed the Trash snapshot')
  const host = document.createElement('div'); document.body.appendChild(host)
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/book/:bookId/settings/trash', name: 'book-settings-trash', component: TrashList },
    { path: '/book/:id', name: 'book-details', component: { template: '<div />' } },
  ] })
  await router.push(`/book/${bookId}/settings/trash`); await router.isReady()
  const app = createApp(TrashList); app.use(getActivePinia()); app.use(router); app.mount(host)
  for (let attempt = 0; attempt < 100 && !host.textContent.includes('Rice'); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 20)); await nextTick()
  }
  check(['Rice', '2 x 60', 'Groceries', 'Cash', 'Corner shop', '120'].every(text => host.textContent.includes(text)), 'Trash UI omitted identifying transaction details')
  check(!host.textContent.includes('No description'), 'blank description placeholder hides transaction details')
  app.unmount(); host.remove()
  await restoreTrashEntries([detailedEntry.id])
  check(!(await db.transactions.get(detailsId)).details, 'restoring leaked display metadata into the transaction')
  passed.push('description-free Trash shows line items and metadata; old entries resolve names and new snapshots preserve them')
  const dump = await useDatabaseExport().getDatabaseDump()
  check(!('settings' in dump.data) && !('trash' in dump.data) && !('upload_queue' in dump.data), 'local tables included in backup')
  await useBookStore().deleteBook(bookId)
  check(!(await db.trash.count()) && !(await db.upload_queue.count()), 'book deletion retained trash/photos')
  passed.push('atomic trash delete, undo, synced and uncertain restore IDs, retention, book cleanup and backup exclusion')
  passed.push(...await runBackupHealthTests())
  passed.push(...await runTransactionTrashTests())
  passed.push(...await runAccessibilityTests())
  passed.push(...await runAccessibilityRouteTests())
  return passed
}
