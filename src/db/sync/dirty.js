import { db } from '@/db/dexie'
import { formatDateTimeForDB } from '@/utils/dateUtils'
import { SYNC_TABLES } from './protocol'
import { withTrackingSuspended } from './tracking'

const asIds = ids => (Array.isArray(ids) ? ids : [ids]).filter(id => id !== undefined && id !== null)

// Rows carry `sync_status: 'pending'` from the store that wrote them. Deletions
// have no row left to flag, so they leave a tombstone behind instead.
export async function recordDeletions(table, ids) {
    const list = asIds(ids)
    if (!list.length) return

    const deleted_at = formatDateTimeForDB()
    await withTrackingSuspended(() =>
        db.sync_tombstones.bulkAdd(list.map(record_id => ({ table, record_id, deleted_at })))
    )
}

// Undo re-inserts a row, so the matching tombstone has to go or the next pull
// would delete the restored row again.
export async function forgetDeletions(table, ids) {
    const list = asIds(ids)
    if (!list.length) return

    const pairs = list.map(id => [table, id])
    const keys = await db.sync_tombstones.where('[table+record_id]').anyOf(pairs).primaryKeys()
    if (keys.length) await withTrackingSuspended(() => db.sync_tombstones.bulkDelete(keys))
}

export function pendingRows(table, limit) {
    return db[table].where('sync_status').equals('pending').limit(limit).toArray()
}

export async function markSynced(table, ids) {
    const list = asIds(ids)
    if (!list.length) return

    await withTrackingSuspended(() =>
        db[table].where(':id').anyOf(list).modify({ sync_status: 'synced' })
    )
}

export async function countPendingChanges() {
    let total = 0

    for (const name of SYNC_TABLES) {
        total += await db[name].where('sync_status').equals('pending').count()
    }

    total += await db.sync_tombstones.count()
    return total
}

// Reads one batch of local changes, filling the batch with tombstones once the
// row budget is spent.
export async function collectPendingChanges(limit) {
    const changes = {}
    const deletions = {}
    let count = 0

    for (const name of SYNC_TABLES) {
        if (count >= limit) break

        const rows = await pendingRows(name, limit - count)
        if (rows.length) {
            changes[name] = rows
            count += rows.length
        }
    }

    if (count < limit) {
        const tombstones = await db.sync_tombstones.orderBy('id').limit(limit - count).toArray()

        for (const tombstone of tombstones) {
            if (!SYNC_TABLES.includes(tombstone.table)) continue
            if (!deletions[tombstone.table]) deletions[tombstone.table] = []
            deletions[tombstone.table].push({ id: tombstone.record_id, deleted_at: tombstone.deleted_at })
            count += 1
        }
    }

    return { changes, deletions, count }
}

export async function clearTombstones(sent) {
    const pairs = []

    for (const [table, ids] of Object.entries(sent || {})) {
        for (const id of asIds(ids)) pairs.push([table, id])
    }

    if (!pairs.length) return

    const keys = await db.sync_tombstones.where('[table+record_id]').anyOf(pairs).primaryKeys()
    if (keys.length) await withTrackingSuspended(() => db.sync_tombstones.bulkDelete(keys))
}

// Used by the full-backup fallback: the dump is the whole database, so every
// pending row and tombstone has been covered by that upload.
export async function markAllSynced() {
    await withTrackingSuspended(async () => {
        for (const name of SYNC_TABLES) {
            await db[name].where('sync_status').equals('pending').modify({ sync_status: 'synced' })
        }

        await db.sync_tombstones.clear()
    })
}
