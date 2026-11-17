import { db } from '@/db/dexie'

// One row in `sync_state` keeps everything the engine needs between sessions:
// which client this install is, how far it has pulled, and how retries are going.
const STATE_KEY = 'syncState'

const DEFAULT_STATE = {
    clientId: '',
    protocol: 'unknown', // 'unknown' | 'changes' | 'dump'
    cursor: '',
    lastSyncAt: '',
    attempts: 0,
    nextRetryAt: 0,
    lastError: '',
}

export async function getSyncState() {
    const row = await db.sync_state.get(STATE_KEY)
    return { ...DEFAULT_STATE, ...(row?.value || {}) }
}

export async function patchSyncState(patch) {
    const next = { ...(await getSyncState()), ...patch }
    await db.sync_state.put({ key: STATE_KEY, value: next })
    return next
}

export async function getClientId() {
    const state = await getSyncState()
    if (state.clientId) return state.clientId

    const id =
        globalThis.crypto?.randomUUID?.() ||
        `client-${Date.now()}-${Math.random().toString(16).slice(2)}`

    await patchSyncState({ clientId: id })
    return id
}

// Called when the endpoint or token changes: the old cursor belongs to another
// server, so the next sync has to start from scratch.
export async function resetSyncState() {
    const state = await getSyncState()
    const next = { ...DEFAULT_STATE, clientId: state.clientId }
    await db.sync_state.put({ key: STATE_KEY, value: next })
    return next
}
