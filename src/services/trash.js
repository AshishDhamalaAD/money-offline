import { describeTrashEntries } from '@/services/trashDetails'
import { db } from '@/db/dexie'
import { recordDeletions, forgetDeletions } from '@/db/sync/dirty'
import { withSyncLock } from '@/db/sync/lock'
import { formatDateTimeForDB } from '@/utils/dateUtils'
import { resolveAttachmentRefs } from '@/services/uploadQueue'

export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export function trashTransactions(ids = []) {
  if (!ids.length) return Promise.resolve([])
  return withSyncLock(() => db.transaction('rw', db.transactions, db.trash, db.sync_tombstones, db.products, db.categories, db.contacts, db.payment_modes, async () => {
    const rows = (await db.transactions.bulkGet([...new Set(ids)])).filter(Boolean)
    const entries = await describeTrashEntries(rows.map(row => ({
      table: 'transactions', record_id: row.id, book_id: row.book_id, row, deleted_at: Date.now(),
    })))
    await db.trash.bulkAdd(entries)
    await recordDeletions('transactions', rows.map(row => row.id))
    await db.transactions.bulkDelete(rows.map(row => row.id))
    return rows
  }))
}

async function restoreEntries(entries) {
  const restored = []
  // Resolve completed uploads before entering the write transaction.
  for (const entry of entries) entry.row.attachments = await resolveAttachmentRefs(entry.row.attachments || [])
  await db.transaction('rw', db.transactions, db.trash, db.sync_tombstones, db.books, async () => {
    for (const entry of entries) {
      if (!(await db.trash.get(entry.id))) continue
      if (entry.deleted_at <= Date.now() - TRASH_RETENTION_MS) throw new Error('This transaction has expired from Trash.')
      if (!(await db.books.get(entry.book_id))) throw new Error('This book no longer exists.')
      const pending = await db.sync_tombstones.where('[table+record_id]').equals(['transactions', entry.record_id]).count()
      const row = { ...entry.row, updated_at: formatDateTimeForDB(), sync_status: 'pending' }
      // A request may have reached the server even when its response was lost.
      // Once a delete has been attempted, restore under a fresh identity.
      if (!pending || entry.delete_attempted || await db.transactions.get(row.id)) delete row.id
      const id = await db.transactions.add(row)
      // Keep an uncertain old delete pending when restoring under a fresh id.
      if (id === entry.record_id) await forgetDeletions('transactions', entry.record_id)
      await db.trash.delete(entry.id)
      restored.push(id)
    }
  })
  return restored
}

export function restoreTrashEntries(ids) {
  return withSyncLock(async () => restoreEntries((await db.trash.bulkGet(ids)).filter(Boolean)))
}

// The undo snackbar holds original transaction ids; snapshots live in Dexie.
export function restoreTrashedTransactions(recordIds) {
  if (!recordIds.length) return Promise.resolve([])
  return withSyncLock(async () => restoreEntries(await db.trash.where('[table+record_id]')
    .anyOf(recordIds.map(id => ['transactions', id])).toArray()))
}

export function purgeExpiredTrash(now = Date.now()) {
  return db.trash.where('deleted_at').belowOrEqual(now - TRASH_RETENTION_MS).delete()
}
