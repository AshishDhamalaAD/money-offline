import { getApiToken } from '@/utils/secureStore'
import { ref } from 'vue'
import { defineStore } from 'pinia'

import { db } from '@/db/dexie'
import { runSync } from '@/db/sync/engine'
import { countPendingChanges } from '@/db/sync/dirty'
import { BACKGROUND_SYNC_TAG } from '@/db/sync/protocol'
import { getSyncState, patchSyncState, resetSyncState } from '@/db/sync/state'
import { installChangeTracking, onLocalChange } from '@/db/sync/tracking'
import {
    countLocalAttachmentRefs,
    processQueue,
    refreshQueueState,
    retryFailedUploads as resetFailedUploads,
    uploadQueueState,
} from '@/services/uploadQueue'

// Retries grow: quick while the phone is still awake, then patient enough to
// stop draining the battery on a dead connection.
const RETRY_DELAYS = [2000, 10000, 30000, 120000, 300000]

// A burst of edits (import, bulk move) becomes one sync instead of one per row.
const CHANGE_DEBOUNCE_MS = 2500

// Pulling on every app open would be chatty; this keeps multi-device data fresh
// without syncing on every glance at the dashboard.
const STALE_SYNC_MS = 15 * 60 * 1000

export const useSyncStore = defineStore('sync', () => {
    const isSyncing = ref(false)
    const lastSyncTime = ref(null)
    const error = ref(null)
    const pendingChanges = ref(0)
    const protocol = ref('unknown')
    const retryAt = ref(0)
    const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
    const lastResult = ref(null)
    const backgroundSyncSupported = ref(false)

    let inFlight = null
    let debounceTimer = null
    let retryTimer = null
    let started = false
    let unsubscribeChanges = null

    async function hasSyncConfig() {
        const [endpoint, token] = await Promise.all([
            db.settings.get('apiEndpoint'),
            getApiToken(),
        ])

        return Boolean(endpoint?.value && token)
    }

    async function refreshPending() {
        try {
            pendingChanges.value = await countPendingChanges()
        } catch (e) {
            console.error('Failed to count pending changes', e)
        }

        try {
            await refreshQueueState()
        } catch (e) {
            console.error('Failed to count queued photos', e)
        }

        return pendingChanges.value
    }

    function clearRetryTimer() {
        if (retryTimer) clearTimeout(retryTimer)
        retryTimer = null
    }

    async function scheduleRetry() {
        if (!online.value) return

        const state = await getSyncState()
        const attempts = Math.min((state.attempts || 0) + 1, RETRY_DELAYS.length)
        const delay = RETRY_DELAYS[Math.min(attempts - 1, RETRY_DELAYS.length - 1)]
        const nextRetryAt = Date.now() + delay

        await patchSyncState({ attempts, nextRetryAt })
        retryAt.value = nextRetryAt

        clearRetryTimer()
        retryTimer = setTimeout(() => {
            retryTimer = null
            triggerSync({ reason: 'retry' })
        }, delay)
    }

    async function resetBackoff() {
        clearRetryTimer()
        retryAt.value = 0
        await patchSyncState({ attempts: 0, nextRetryAt: 0 })
    }

    // Background Sync lets the browser retry after the tab is gone. The page
    // owns the sync engine, so the worker only asks an open window to run it.
    async function registerBackgroundSync() {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
            backgroundSyncSupported.value = false
            return false
        }

        try {
            const registration = await navigator.serviceWorker.ready
            if (!registration?.sync?.register) {
                backgroundSyncSupported.value = false
                return false
            }

            await registration.sync.register(BACKGROUND_SYNC_TAG)
            backgroundSyncSupported.value = true
            return true
        } catch (e) {
            backgroundSyncSupported.value = false
            return false
        }
    }

    // The in-flight guard is set synchronously. Two triggers can arrive in the
    // same tick (startup plus a visibility change, for example); awaiting the
    // config check first would let both runs proceed and upload the same rows
    // twice.
    function triggerSync({ reason = 'manual' } = {}) {
        if (inFlight) return inFlight

        inFlight = (async () => {
            try {
                // Automatic syncs respect the retry schedule. Background Sync in
                // particular fires as soon as it is registered, which would
                // otherwise turn one failure into a burst of attempts.
                if (reason !== 'manual' && retryAt.value && retryAt.value > Date.now()) {
                    return {
                        success: false,
                        message: 'Waiting for the next retry',
                        retryable: true,
                        deferred: true,
                    }
                }

                if (!(await hasSyncConfig())) {
                    error.value = null
                    return {
                        success: false,
                        message: 'Sync is not configured. Add an endpoint and token in Settings.',
                        retryable: false,
                        configured: false,
                    }
                }

                if (!online.value) {
                    error.value = 'No internet connection'
                    return { success: false, offline: true, message: 'No internet connection', retryable: true }
                }

                clearRetryTimer()
                isSyncing.value = true
                error.value = null

                // Queued photos go first: a backup containing `local:` paths
                // would point at files the server has never seen.
                const uploads = await processQueue()
                if (uploads.uploaded > 0) await refreshPending()

                const pendingPhotos = await countLocalAttachmentRefs()
                if (pendingPhotos > 0) {
                    const blocked = uploads.failed > 0
                    const message = blocked
                        ? 'Some photos could not upload. Retry from Settings → Sync, or remove them from the entry.'
                        : 'Waiting for photos to upload'

                    error.value = message
                    const result = {
                        success: false,
                        message,
                        retryable: !blocked,
                        deferred: true,
                        pendingUploads: uploads.queued,
                        pendingPhotos,
                    }
                    lastResult.value = { ...result, reason, at: Date.now() }

                    if (!blocked) await scheduleRetry()
                    return result
                }

                const result = await runSync()
                lastResult.value = { ...result, reason, at: Date.now() }

                if (result.success) {
                    lastSyncTime.value = result.syncedAt ? new Date(result.syncedAt) : new Date()
                    protocol.value = result.protocol || protocol.value
                    error.value = null
                    retryAt.value = 0
                    await patchSyncState({ attempts: 0, nextRetryAt: 0 })
                    await refreshPending()
                } else {
                    error.value = result.message
                    if (result.protocol) protocol.value = result.protocol

                    // Leave a retry queued and ask the browser to wake us later.
                    if (result.retryable !== false) {
                        await registerBackgroundSync()
                        await scheduleRetry()
                    }
                }

                return result
            } finally {
                isSyncing.value = false
                inFlight = null
            }
        })()

        return inFlight
    }

    // Settings → Sync "Retry now": failed photos become queued again, then the
    // queue is drained immediately.
    async function retryUploads() {
        await resetFailedUploads()
        const result = await processQueue()
        await refreshPending()

        if (result.uploaded > 0 && pendingChanges.value > 0) {
            return triggerSync({ reason: 'manual' })
        }

        return result
    }

    // Called for every local write: keeps the pending badge honest and lets a
    // quiet period settle before uploading.
    function scheduleSync() {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(async () => {
            debounceTimer = null
            await refreshPending()
            triggerSync({ reason: 'change' })
        }, CHANGE_DEBOUNCE_MS)
    }

    async function handleOnline() {
        online.value = true
        await resetBackoff()
        // Sending the photos first also rewrites the records that reference
        // them, which is what makes the following sync safe.
        if (await hasSyncConfig()) await processQueue()
        await refreshPending()

        if (pendingChanges.value > 0) triggerSync({ reason: 'online' })
    }

    function handleOffline() {
        online.value = false
        clearRetryTimer()
    }

    async function handleVisibilityChange() {
        if (document.visibilityState !== 'visible') return
        if (!online.value) return

        await refreshPending()

        const due = !retryAt.value || retryAt.value <= Date.now()
        if (pendingChanges.value > 0 && due) triggerSync({ reason: 'foreground' })
    }

    function handleServiceWorkerMessage(event) {
        if (event.data?.type === 'RUN_SYNC') triggerSync({ reason: 'background-sync' })
    }

    async function start() {
        if (started) return
        started = true

        installChangeTracking()
        unsubscribeChanges = onLocalChange(scheduleSync)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
        }

        const state = await getSyncState()
        protocol.value = state.protocol
        lastSyncTime.value = state.lastSyncAt ? new Date(state.lastSyncAt) : null
        retryAt.value = state.nextRetryAt || 0

        await refreshPending()

        if (online.value && uploadQueueState.value.queued > 0 && await hasSyncConfig()) {
            // A photo queued in a previous session should still go out, even if
            // the form it belonged to was never saved.
            processQueue()
                .then(() => refreshPending())
                .catch(e => console.error('Failed to drain the photo queue', e))
        }

        if (pendingChanges.value > 0) await registerBackgroundSync()
        if (!(await hasSyncConfig())) return

        // A retry may already be due from the previous session.
        if (state.nextRetryAt && state.nextRetryAt > Date.now()) {
            clearRetryTimer()
            retryTimer = setTimeout(() => {
                retryTimer = null
                triggerSync({ reason: 'retry' })
            }, state.nextRetryAt - Date.now())
            return
        }

        const stale =
            !state.lastSyncAt || Date.now() - new Date(state.lastSyncAt).getTime() > STALE_SYNC_MS

        if (pendingChanges.value > 0 || stale) triggerSync({ reason: 'startup' })
    }

    function stop() {
        if (!started) return
        started = false

        unsubscribeChanges?.()
        unsubscribeChanges = null

        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        document.removeEventListener('visibilitychange', handleVisibilityChange)

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
        }

        clearRetryTimer()
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = null
    }

    return {
        isSyncing,
        lastSyncTime,
        error,
        pendingChanges,
        protocol,
        retryAt,
        online,
        lastResult,
        backgroundSyncSupported,
        uploadQueueState,
        start,
        stop,
        triggerSync,
        retryUploads,
        scheduleSync,
        refreshPending,
        registerBackgroundSync,
        resetSyncState,
    }
})
