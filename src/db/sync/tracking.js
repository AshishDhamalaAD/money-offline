import { db } from '@/db/dexie'
import { SYNC_TABLES } from './protocol'

// Writes made by the sync engine itself (applying remote rows, clearing dirty
// flags) must not count as local changes, otherwise every sync would queue the
// next one.
let suspended = 0
const listeners = new Set()

let installed = false

function notify() {
    if (suspended > 0) return
    for (const listener of listeners) listener()
}

export function onLocalChange(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export async function withTrackingSuspended(fn) {
    suspended += 1
    try {
        return await fn()
    } finally {
        suspended -= 1
    }
}

// Any create, update or delete in a synced table schedules a debounced sync,
// so every store gets change tracking without repeating the wiring.
export function installChangeTracking() {
    if (installed) return
    installed = true

    for (const name of SYNC_TABLES) {
        const table = db[name]
        if (!table) continue
        table.hook('creating', () => notify())
        table.hook('updating', () => notify())
        table.hook('deleting', () => notify())
    }
}
