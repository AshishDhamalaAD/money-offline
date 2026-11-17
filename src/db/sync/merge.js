import { db } from '@/db/dexie'
import { SYNC_TABLES } from './protocol'
import { withTrackingSuspended } from './tracking'

const stampOf = row => String(row?.updated_at || row?.deleted_at || '')

// Applies a pulled page on top of the local database.
//
// Conflicts are resolved last-writer-wins on the timestamp: a remote row only
// overwrites a local one when it is newer, and a local edit that is newer than
// the remote delete brings the row back (it will be pushed on the next round).
export async function applyRemoteChanges(changes = {}, deletions = {}) {
    const summary = { applied: 0, skipped: 0, deleted: 0, conflicts: 0, restored: 0 }

    const tables = [...SYNC_TABLES.map(name => db[name]), db.sync_tombstones]

    await withTrackingSuspended(() =>
        db.transaction('rw', tables, async () => {
            for (const name of SYNC_TABLES) {
                const table = db[name]
                const remoteRows = Array.isArray(changes?.[name]) ? changes[name] : []

                for (const row of remoteRows) {
                    if (row?.id === undefined || row?.id === null) continue

                    const local = await table.get(row.id)

                    if (!local) {
                        await table.put({ ...row, sync_status: 'synced' })
                        summary.applied += 1
                        continue
                    }

                    const localWasPending = local.sync_status === 'pending'

                    if (stampOf(row) > stampOf(local)) {
                        await table.put({ ...row, sync_status: 'synced' })
                        summary.applied += 1
                        if (localWasPending) summary.conflicts += 1
                    } else {
                        summary.skipped += 1
                    }
                }

                const remoteDeletes = Array.isArray(deletions?.[name]) ? deletions[name] : []

                for (const tombstone of remoteDeletes) {
                    const id = tombstone?.id ?? tombstone?.record_id
                    if (id === undefined || id === null) continue

                    const deletedAt = String(tombstone.deleted_at || '')
                    const local = await table.get(id)

                    if (local) {
                        const localWasPending = local.sync_status === 'pending'

                        if (localWasPending && stampOf(local) > deletedAt) {
                            summary.restored += 1
                        } else {
                            await table.delete(id)
                            summary.deleted += 1
                        }
                    }

                    // A local tombstone for the same record is redundant now.
                    const localKeys = await db.sync_tombstones
                        .where('[table+record_id]')
                        .equals([name, id])
                        .primaryKeys()

                    if (localKeys.length) await db.sync_tombstones.bulkDelete(localKeys)
                }
            }
        })
    )

    return summary
}
