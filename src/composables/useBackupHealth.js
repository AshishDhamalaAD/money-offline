import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'

import { db } from '@/db/dexie'
import { useSettingsStore } from '@/store/settingsStore'
import { BACKUP_SETTING_KEYS, isBackupDue, normalizeStorageEstimate } from '@/utils/backupHealth'

// One shared instance serves settings and the global banner. App owns its lifecycle.
export const useBackupHealth = defineStore('backupHealth', () => {
  const settings = useSettingsStore()
  const now = ref(Date.now())
  const estimate = ref(null)
  const estimateStatus = ref('checking')
  const persistenceStatus = ref('checking')
  const refreshing = ref(false)
  const requestingPersistence = ref(false)
  const persistenceMessage = ref('')
  const settingsError = ref('')
  const settingsReady = ref(false)

  const backupDue = computed(() => settingsReady.value && isBackupDue(settings, now.value))
  const storagePressure = computed(() => estimate.value !== null && estimate.value.percent >= 80)
  const showStorageWarning = computed(() => storagePressure.value && settings.storageWarningSnoozedUntil <= now.value)
  const canRequestPersistence = computed(() =>
    typeof navigator.storage?.persist === 'function' && persistenceStatus.value !== 'granted',
  )

  let subscription = null
  let timer = null
  let started = false
  let refreshWork = null
  let requestWork = null

  async function readEstimate() {
    if (typeof navigator.storage?.estimate !== 'function') {
      estimate.value = null
      estimateStatus.value = 'unsupported'
      return
    }
    try {
      estimate.value = normalizeStorageEstimate(await navigator.storage.estimate())
      estimateStatus.value = estimate.value ? 'available' : 'error'
    } catch {
      estimate.value = null
      estimateStatus.value = 'error'
    }
  }

  async function readPersistence() {
    if (typeof navigator.storage?.persisted !== 'function') {
      persistenceStatus.value = 'unsupported'
      return
    }
    try {
      const persisted = await navigator.storage.persisted()
      persistenceStatus.value = persisted === true ? 'granted' : persisted === false ? 'not-granted' : 'error'
    } catch {
      persistenceStatus.value = 'error'
    }
  }

  function refresh() {
    now.value = Date.now()
    if (refreshWork) return refreshWork
    refreshing.value = true
    refreshWork = Promise.allSettled([readEstimate(), readPersistence()]).finally(() => {
      refreshing.value = false
      refreshWork = null
    })
    return refreshWork
  }

  function requestPersistence() {
    if (requestWork) return requestWork
    if (!canRequestPersistence.value) return Promise.resolve()
    requestingPersistence.value = true
    persistenceMessage.value = ''
    const work = async () => {
      try {
        // Call directly from the button gesture; never request on startup.
        const granted = await navigator.storage.persist()
        persistenceMessage.value = granted
          ? 'Persistent storage was granted. Keep making backups.'
          : 'The browser did not grant persistent storage. You can try again later.'
      } catch {
        persistenceMessage.value = 'Could not request persistent storage. Try again later.'
      }
      // An older status check must finish before reading the new status.
      if (refreshWork) await refreshWork
      await refresh()
    }
    requestWork = work().finally(() => {
      requestingPersistence.value = false
      requestWork = null
    })
    return requestWork
  }

  function onForeground() {
    if (document.visibilityState === 'visible') refresh()
  }

  function start() {
    if (started) return
    started = true
    subscription = liveQuery(() => db.settings.bulkGet(BACKUP_SETTING_KEYS)).subscribe({
      next(rows) {
        settings.applyBackupSettings(rows)
        settingsReady.value = true
        settingsError.value = ''
        now.value = Date.now()
      },
      error() {
        settingsReady.value = false
        settingsError.value = 'Could not read backup reminder settings. Reopen the app to retry.'
      },
    })
    refresh()
    timer = window.setInterval(onForeground, 60 * 1000)
    document.addEventListener('visibilitychange', onForeground)
    window.addEventListener('focus', onForeground)
  }

  function stop() {
    subscription?.unsubscribe()
    subscription = null
    if (timer) window.clearInterval(timer)
    timer = null
    started = false
    document.removeEventListener('visibilitychange', onForeground)
    window.removeEventListener('focus', onForeground)
  }

  return {
    backupDue, storagePressure, showStorageWarning, estimate, estimateStatus,
    persistenceStatus, canRequestPersistence, refreshing, requestingPersistence,
    persistenceMessage, settingsError, refresh, requestPersistence, start, stop,
  }
})
