import { getApiToken } from '@/utils/secureStore'
import { withSyncLock } from './lock'
import { countLocalAttachmentRefs } from '@/services/uploadQueue'
import { gzip } from 'pako'

import { db } from '@/db/dexie'
import { SYNC_APP_DATA_API_URL, SYNC_CHANGES_API_URL } from '@/constants/routes'
import { useDatabaseExport } from '@/composables/useDatabaseExport'
import {
    SYNC_BATCH_SIZE,
    SYNC_CLIENT_HEADER,
    SYNC_MAX_PAGES,
    SYNC_TOKEN_HEADER,
} from './protocol'
import { applyRemoteChanges } from './merge'
import {
    clearTombstones,
    collectPendingChanges,
    markAllSynced,
    markSynced,
} from './dirty'
import { getClientId, getSyncState, patchSyncState } from './state'

const REQUEST_TIMEOUT_MS = 30000

class SyncHttpError extends Error {
    constructor(status, message) {
        super(message)
        this.name = 'SyncHttpError'
        this.status = status
    }
}

class UnsupportedServerError extends Error {
    constructor() {
        super('Server does not support incremental sync')
        this.name = 'UnsupportedServerError'
        this.unsupported = true
    }
}

const endpointBase = endpoint => String(endpoint || '').trim().replace(/\/+$/, '')

async function readConfig() {
    const [endpoint, token, mode] = await Promise.all([
        db.settings.get('apiEndpoint'),
        getApiToken(),
        db.settings.get('syncMode'),
    ])

    return {
        endpoint: endpointBase(endpoint?.value),
        token: token || '',
        // Full backup is the default, so a server that only knows the original
        // endpoint never receives a probe for the newer one.
        mode: mode?.value === 'incremental' ? 'incremental' : 'dump',
    }
}

function requestHeaders(token, clientId, json = false) {
    const headers = {
        Accept: 'application/json',
        [SYNC_TOKEN_HEADER]: token,
    }

    if (clientId) headers[SYNC_CLIENT_HEADER] = clientId
    if (json) headers['Content-Type'] = 'application/json'
    return headers
}

async function request(url, options = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        return await fetch(url, { ...options, signal: controller.signal })
    } finally {
        clearTimeout(timer)
    }
}

function isUnsupportedResponse(response) {
    return [404, 405, 501].includes(response.status)
}

// A server without the changes endpoint does not always answer 404. Frameworks
// and hosts that fall back to index.html answer 200 with an HTML page, and some
// APIs answer 200 with an empty object. Treating either as a successful pull
// would leave local rows marked as synced without ever uploading them, so only
// a real changes payload is accepted; anything else switches to the full backup.
function isChangesPayload(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return false
    if (body.serverTime === undefined && body.cursor === undefined) return false

    for (const key of ['changes', 'deletions']) {
        const value = body[key]
        if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
            return false
        }
    }

    return true
}

async function pullChanges(config, clientId, state) {
    const summary = { pulled: 0, deleted: 0, conflicts: 0 }
    let cursor = state.cursor || ''

    for (let page = 0; page < SYNC_MAX_PAGES; page += 1) {
        const url = `${config.endpoint}${SYNC_CHANGES_API_URL}?since=${encodeURIComponent(cursor)}`
        const response = await request(url, {
            headers: requestHeaders(config.token, clientId),
        })

        if (isUnsupportedResponse(response)) throw new UnsupportedServerError()
        if (!response.ok) {
            throw new SyncHttpError(
                response.status,
                `Server responded with ${response.status} ${response.statusText}`,
            )
        }

        const body = await response.json().catch(() => null)
        if (!isChangesPayload(body)) throw new UnsupportedServerError()

        const applied = await applyRemoteChanges(body.changes, body.deletions)

        summary.pulled += applied.applied
        summary.deleted += applied.deleted
        summary.conflicts += applied.conflicts

        const nextCursor = String(body.serverTime ?? body.cursor ?? cursor)
        if (!nextCursor || (nextCursor === cursor && !body.hasMore)) break

        cursor = nextCursor
        await patchSyncState({ cursor })

        if (!body.hasMore) break
    }

    return summary
}

function assertUploadedAttachments(changes) {
    for (const table of ['transactions', 'products']) {
        if ((changes[table] || []).some(row => row.attachments?.some(ref => typeof ref === 'string' && ref.startsWith('local:')))) {
            throw new Error('Waiting for photos to upload')
        }
    }
}

async function pushChanges(config, clientId) {
    const summary = { pushed: 0, deleted: 0 }

    for (let round = 0; round < SYNC_MAX_PAGES; round += 1) {
        const batch = await collectPendingChanges(SYNC_BATCH_SIZE)
        if (!batch.count) break
        assertUploadedAttachments(batch.changes)

        await db.trash.filter(entry => (batch.deletions.transactions || []).some(row => row.id === entry.record_id)).modify({ delete_attempted: true })
        const response = await request(`${config.endpoint}${SYNC_CHANGES_API_URL}`, {
            method: 'POST',
            headers: requestHeaders(config.token, clientId, true),
            body: JSON.stringify({
                clientId,
                pushedAt: new Date().toISOString(),
                changes: batch.changes,
                deletions: batch.deletions,
            }),
        })

        if (isUnsupportedResponse(response)) throw new UnsupportedServerError()
        if (!response.ok) {
            throw new SyncHttpError(
                response.status,
                `Server responded with ${response.status} ${response.statusText}`,
            )
        }

        // A 2xx means the whole batch was stored. The server may answer with
        // per-table ids, but treating the request as all-or-nothing keeps the
        // client correct without depending on that shape.
        for (const [table, rows] of Object.entries(batch.changes)) {
            await markSynced(table, rows.map(row => row.id))
            summary.pushed += rows.length
        }

        for (const [table, rows] of Object.entries(batch.deletions)) {
            await clearTombstones({ [table]: rows.map(row => row.id) })
            summary.deleted += rows.length
        }
    }

    return summary
}

// Fallback for servers that only understand the original full-backup upload.
async function pushFullDump(config) {
    const { getDatabaseDump } = useDatabaseExport()
    const data = await getDatabaseDump()
    assertUploadedAttachments(data.data)
    const compressed = gzip(JSON.stringify(data))

    const form = new FormData()
    form.append('file', new Blob([compressed], { type: 'application/gzip' }), 'data.json.gz')

    await db.trash.toCollection().modify({ delete_attempted: true })
    const response = await request(`${config.endpoint}${SYNC_APP_DATA_API_URL}`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            [SYNC_TOKEN_HEADER]: config.token,
        },
        body: form,
    })

    if (!response.ok) {
        throw new SyncHttpError(
            response.status,
            `Server responded with ${response.status} ${response.statusText}`,
        )
    }

    await markAllSynced()
}

function isRetryable(error) {
    if (!error?.status) return true // network error, timeout, aborted request
    if (error.status === 408 || error.status === 429) return true
    return error.status >= 500
}

// Pull, then push. Pulling first means local edits that are newer than the
// server's copy survive the merge and are uploaded afterwards.
export function runSync() {
    return withSyncLock(runSyncLocked)
}

async function runSyncLocked() {
    try {
        if (await countLocalAttachmentRefs()) return { success: false, retryable: true, message: 'Waiting for photos to upload' }
        const config = await readConfig()

        if (!config.endpoint) {
            return { success: false, message: 'API Endpoint not configured', retryable: false }
        }
        if (!config.token) {
            return { success: false, message: 'API Token not configured', retryable: false }
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return { success: false, offline: true, message: 'No internet connection', retryable: true }
        }

        const clientId = await getClientId()
        const state = await getSyncState()
        const summary = {
            success: true,
            pushed: 0,
            pulled: 0,
            deleted: 0,
            conflicts: 0,
            protocol: config.mode,
        }

        // The sync style is a user choice. Full backup stays the default, so
        // servers that only know the original endpoint are never probed for the
        // newer one; incremental falls back to it if the server cannot serve it.
        let protocol = 'dump'

        if (config.mode === 'incremental') {
            protocol = state.protocol === 'dump' ? 'dump' : 'changes'

            if (protocol === 'changes') {
                try {
                    const pulled = await pullChanges(config, clientId, state)
                    summary.pulled = pulled.pulled
                    summary.deleted = pulled.deleted
                    summary.conflicts = pulled.conflicts

                    const pushed = await pushChanges(config, clientId)
                    summary.pushed = pushed.pushed
                    summary.deleted += pushed.deleted
                } catch (error) {
                    if (!error?.unsupported) throw error
                    protocol = 'dump'
                }
            }
        }

        if (protocol === 'dump') {
            await pushFullDump(config)
        }

        const syncedAt = new Date().toISOString()
        await patchSyncState({
            protocol,
            lastSyncAt: syncedAt,
            attempts: 0,
            nextRetryAt: 0,
            lastError: '',
        })

        return { ...summary, protocol, syncedAt }
    } catch (error) {
        const message =
            error?.name === 'AbortError'
                ? 'Sync timed out. It will retry automatically.'
                : error?.message || 'Sync failed'

        await patchSyncState({ lastError: message })

        return {
            success: false,
            message,
            status: error?.status || 0,
            retryable: isRetryable(error),
        }
    }
}
