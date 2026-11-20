import { createApp, h, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { db } from '/src/db/dexie.js'
import { useSettingsStore } from '/src/store/settingsStore.js'
import { useSyncStore } from '/src/store/syncStore.js'
import { useBackupHealth } from '/src/composables/useBackupHealth.js'
import { useDatabaseExport } from '/src/composables/useDatabaseExport.js'
import { useDataExport } from '/src/composables/useDataExport.js'
import { runSync } from '/src/db/sync/engine.js'
import { BACKUP_SETTING_KEYS, DAY_MS, isBackupDue, normalizeStorageEstimate } from '/src/utils/backupHealth.js'
import DatabaseBackup from '/src/pages/settings/DatabaseBackup.vue'
import StorageHealth from '/src/pages/settings/StorageHealth.vue'
import StatusBanner from '/src/components/layout/StatusBanner.vue'
import PageHeader from '/src/components/layout/PageHeader.vue'
import App from '/src/App.vue'

function check(value, message) { if (!value) throw new Error(message) }
async function waitFor(read, message) {
  for (let attempt = 0; attempt < 150; attempt++) {
    await nextTick()
    if (await read()) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(message)
}

export async function runBackupHealthTests() {
  const passed = []
  const fixedNow = Date.parse('2026-11-20T12:00:00Z')
  for (const days of [7, 14, 30]) {
    const state = { lastBackupGeneratedAt: new Date(fixedNow - days * DAY_MS).toISOString(), backupReminderIntervalDays: days, backupReminderSnoozedUntil: 0 }
    check(!isBackupDue(state, fixedNow - 1) && isBackupDue(state, fixedNow), `${days}-day boundary incorrect`)
    check(!isBackupDue({ ...state, backupReminderSnoozedUntil: fixedNow + DAY_MS }, fixedNow), 'snooze ignored')
    check(isBackupDue({ ...state, backupReminderSnoozedUntil: fixedNow }, fixedNow), 'snooze expiry ignored')
    check(isBackupDue({ ...state, lastBackupGeneratedAt: null }, fixedNow), 'first reminder not immediate')
  }
  check(!isBackupDue({ backupReminderIntervalDays: 0 }, fixedNow), 'Off still reminds')
  check(!isBackupDue({ backupReminderIntervalDays: 1 }, fixedNow), 'invalid interval accepted')
  for (const value of [undefined, {}, { usage: -1, quota: 100 }, { usage: 10, quota: 0 }, { usage: NaN, quota: 1 }, { usage: 1, quota: Infinity }]) {
    check(normalizeStorageEstimate(value) === null, 'invalid estimate accepted')
  }
  check(normalizeStorageEstimate({ usage: 0, quota: 100 }).percent === 0, 'empty storage rejected')
  passed.push('backup intervals use elapsed days, first reminder, Off, snooze boundaries and invalid estimates')

  const storageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'storage')
  const originalAnchorClick = HTMLAnchorElement.prototype.click
  const originalCreateUrl = URL.createObjectURL
  const originalBooksRead = db.books.toArray
  const originalSettingsWrite = db.settings.bulkPut
  const originalFetch = globalThis.fetch
  const pinia = createPinia()
  setActivePinia(pinia)
  const settings = useSettingsStore()
  await db.settings.bulkDelete(BACKUP_SETTING_KEYS)
  await settings.init()
  const health = useBackupHealth()
  const fakeStorage = {
    estimate: async () => ({ usage: 79, quota: 100 }),
    persisted: async () => false,
    persist: async () => false,
  }
  Object.defineProperty(navigator, 'storage', { configurable: true, value: fakeStorage })
  let frame
  let app
  let host
  try {
    health.start()
    health.start()
    await health.refresh()
    check(!health.storagePressure && health.persistenceStatus === 'not-granted', 'initial storage status incorrect')
    check(settings.backupReminderIntervalDays === 0 && !health.backupDue, 'reminders not initially Off')
    await settings.setBackupReminderInterval('7')
    await waitFor(() => health.backupDue, 'missing immediate first reminder')
    await settings.snoozeBackupReminder()
    check(!health.backupDue && settings.backupReminderSnoozedUntil > Date.now(), 'snooze not persisted')
    await settings.setBackupReminderInterval(14)
    check(settings.backupReminderSnoozedUntil === 0 && health.backupDue, 'interval change did not clear snooze')
    check(!(await settings.setBackupReminderInterval(8)).success && settings.backupReminderIntervalDays === 14, 'invalid interval changed settings')

    // A separate frame has its own Dexie instance and document, like another tab.
    frame = document.createElement('iframe')
    frame.src = '/tests/data-flows.html'
    const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }))
    document.body.appendChild(frame)
    await loaded
    await frame.contentWindow.eval("import('/src/db/dexie.js').then(({ db }) => db.settings.put({ key: 'backupReminderIntervalDays', value: 30 }))")
    await waitFor(() => settings.backupReminderIntervalDays === 30, 'other document settings not observed')
    await frame.contentWindow.eval("import('/src/db/dexie.js').then(({ db }) => db.settings.put({ key: 'backupReminderSnoozedUntil', value: Date.now() + 86400000 }))")
    await waitFor(() => !health.backupDue, 'other document snooze not observed')
    frame.remove(); frame = null

    const reloadedPinia = createPinia()
    const reloaded = useSettingsStore(reloadedPinia)
    await reloaded.init()
    check(reloaded.backupReminderIntervalDays === 30 && reloaded.backupReminderSnoozedUntil > Date.now(), 'preferences lost on reload')
    setActivePinia(pinia)
    passed.push('backup settings persist, validate and update across separate browser documents')

    fakeStorage.estimate = async () => ({ usage: 80, quota: 100 })
    await health.refresh()
    check(health.storagePressure && health.showStorageWarning, '80% warning missing')
    await settings.snoozeStorageWarning()
    check(health.storagePressure && !health.showStorageWarning, 'storage snooze hid settings warning or failed to hide banner')
    await db.settings.put({ key: 'storageWarningSnoozedUntil', value: Date.now() - 1 })
    await waitFor(() => health.showStorageWarning, 'storage snooze expiry not observed')
    check(!health.backupDue, 'storage snooze affected backup snooze')

    fakeStorage.estimate = async () => { throw new Error('estimate unavailable') }
    fakeStorage.persisted = async () => true
    await health.refresh()
    check(health.estimate === null && !health.showStorageWarning && health.persistenceStatus === 'granted', 'estimate failure blocked persistence')
    fakeStorage.estimate = async () => ({ usage: 80, quota: 100 })
    fakeStorage.persisted = async () => { throw new Error('status unavailable') }
    await health.refresh()
    check(health.storagePressure && health.persistenceStatus === 'error', 'persistence failure blocked estimate')

    let requests = 0
    fakeStorage.persisted = async () => false
    fakeStorage.persist = async () => { requests++; return false }
    await health.refresh()
    check(requests === 0, 'persistence requested automatically')
    await health.requestPersistence()
    check(requests === 1 && health.persistenceStatus === 'not-granted' && health.persistenceMessage.includes('did not grant'), 'refusal not explained')
    fakeStorage.persist = async () => { requests++; throw new Error('request unavailable') }
    await health.requestPersistence()
    check(health.persistenceMessage.includes('Could not request'), 'request rejection not explained')
    let releaseRequest
    fakeStorage.persist = () => { requests++; return new Promise(resolve => { releaseRequest = resolve }) }
    const firstRequest = health.requestPersistence()
    const duplicateRequest = health.requestPersistence()
    check(requests === 3 && health.requestingPersistence, 'duplicate persistence request started')
    fakeStorage.persisted = async () => true
    releaseRequest(true)
    await Promise.all([firstRequest, duplicateRequest])
    check(health.persistenceStatus === 'granted' && !health.requestingPersistence, 'granted status not refreshed')

    let releaseEstimate
    let checks = 0
    fakeStorage.estimate = () => { checks++; return new Promise(resolve => { releaseEstimate = resolve }) }
    const firstRefresh = health.refresh()
    const duplicateRefresh = health.refresh()
    check(checks === 1, 'overlapping storage checks')
    releaseEstimate({ usage: 0, quota: 100 })
    await Promise.all([firstRefresh, duplicateRefresh])
    Object.defineProperty(navigator, 'storage', { configurable: true, value: {} })
    await health.refresh()
    check(health.estimateStatus === 'unsupported' && health.persistenceStatus === 'unsupported', 'unsupported APIs not handled')
    Object.defineProperty(navigator, 'storage', { configurable: true, value: fakeStorage })
    fakeStorage.estimate = async () => ({ usage: 80, quota: 100 })
    fakeStorage.persisted = async () => false
    await health.refresh()
    passed.push('storage threshold, independent snoozes, API failures, unsupported APIs and persistence request single flight')

    host = document.createElement('div'); document.body.appendChild(host)
    app = createApp(DatabaseBackup); app.use(pinia); app.mount(host)
    let downloads = 0
    let capturedBlob
    HTMLAnchorElement.prototype.click = function () { downloads++ }
    URL.createObjectURL = blob => { capturedBlob = blob; return originalCreateUrl.call(URL, blob) }
    const exportButton = [...host.querySelectorAll('button')].find(button => button.textContent.trim() === 'Export')
    check(host.textContent.includes('No backup recorded on this device'), 'missing unknown backup label')
    exportButton.click()
    await waitFor(() => host.textContent.includes('Backup download started.'), 'manual backup did not finish')
    const generatedAt = settings.lastBackupGeneratedAt
    check(downloads === 1 && Number.isFinite(Date.parse(generatedAt)) && settings.backupReminderSnoozedUntil === 0, 'download not recorded')
    check(!health.backupDue && host.textContent.includes('Last backup generated:'), 'backup reminder not cleared')
    const downloaded = JSON.parse(await capturedBlob.text())
    check(!downloaded.data.settings && !downloaded.data.upload_queue && !downloaded.data.trash, 'backup leaked local metadata')

    db.books.toArray = async () => { throw new Error('test read failure') }
    exportButton.click()
    await waitFor(() => host.textContent.includes('Failed to generate backup:'), 'export failure not visible')
    check(downloads === 1 && settings.lastBackupGeneratedAt === generatedAt, 'failed generation changed timestamp')
    db.books.toArray = originalBooksRead

    db.settings.bulkPut = async () => { throw new Error('test settings write failure') }
    exportButton.click()
    await waitFor(() => host.textContent.includes('generation time could not be recorded'), 'metadata failure not distinguished')
    check(downloads === 2 && settings.lastBackupGeneratedAt === generatedAt, 'metadata failure repeated download or changed timestamp')
    db.settings.bulkPut = originalSettingsWrite
    app.unmount(); app = null; host.remove(); host = null

    const dump = await useDatabaseExport().getDatabaseDump()
    check(!dump.data.settings, 'shared dump exports metadata')
    await useDataExport().buildCsvFile({ bookId: 'all' })
    await useDataExport().buildPdfFile({ bookId: 'all' })
    globalThis.fetch = async () => new Response('{}', { status: 200 })
    check((await runSync()).success, 'full-backup sync failed')
    check(settings.lastBackupGeneratedAt === generatedAt && (await db.settings.get('lastBackupGeneratedAt')).value === generatedAt, 'sync or report export refreshed backup time')
    globalThis.fetch = originalFetch
    const reloadedBackup = useSettingsStore(createPinia())
    await reloadedBackup.init()
    check(reloadedBackup.lastBackupGeneratedAt === generatedAt, 'backup timestamp lost on reload')
    setActivePinia(pinia)
    passed.push('manual JSON download tracking, generation failure, metadata failure, reload and sync/report exclusion')

    await db.settings.bulkDelete(['lastBackupGeneratedAt', 'backupReminderSnoozedUntil', 'storageWarningSnoozedUntil'])
    await waitFor(() => health.backupDue && health.showStorageWarning, 'reminders did not reappear')
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/', name: 'dashboard', component: { render: () => null } },
      { path: '/settings', name: 'settings', component: { render: () => null } },
    ] })
    await router.push('/'); await router.isReady()
    const sync = useSyncStore(pinia)
    sync.online = false
    host = document.createElement('div'); document.body.appendChild(host)
    app = createApp({ render: () => h('div', [h(StatusBanner), h(PageHeader, { title: 'Settings' }), h(StorageHealth)]) })
    app.use(pinia); app.use(router); app.mount(host)
    await waitFor(() => host.querySelector('[data-backup-reminder]') && host.querySelector('[data-storage-warning]'), 'banner rows missing')
    check(host.textContent.includes('Offline'), 'sync message lost')
    const links = [...host.querySelectorAll('[data-status-banner] a')]
    check(links.length === 2 && links.every(link => link.getAttribute('href') === '/settings?tab=data'), 'banner actions target wrong page')
    await waitFor(() => parseFloat(document.documentElement.style.getPropertyValue('--status-banner-height')) === host.querySelector('[data-status-banner]').offsetHeight, 'banner height not published')
    const initialHeight = host.querySelector('[data-status-banner]').offsetHeight
    host.querySelector('[data-backup-reminder] button').click()
    await waitFor(() => !host.querySelector('[data-backup-reminder]'), 'backup snooze action failed')
    await waitFor(() => host.querySelector('[data-status-banner]').offsetHeight < initialHeight, 'banner height not reduced')
    check(host.querySelector('[data-storage-warning]'), 'backup snooze hid storage warning')
    host.querySelector('[data-storage-warning] button').click()
    await waitFor(() => !host.querySelector('[data-storage-warning]'), 'storage snooze action failed')
    check(host.textContent.includes('Estimated storage usage is at least 80%'), 'snooze hid settings warning')
    sync.online = true
    await waitFor(() => !host.querySelector('[data-status-banner]'), 'empty banner did not disappear')
    check(document.documentElement.style.getPropertyValue('--status-banner-height') === '0px', 'empty banner left header offset')
    app.unmount(); app = null; host.remove(); host = null
    passed.push('banner links, stacked sync messages, independent snooze actions and sticky header height')

    await settings.saveSettings('', '')
    await db.settings.put({ key: 'storageWarningSnoozedUntil', value: 0 })
    await waitFor(() => health.showStorageWarning, 'storage warning did not return for lock check')
    settings.pinEnabled = true
    settings.biometricEnabled = true
    settings.biometricCredentialId = null
    settings.autoLockTimeout = 5
    host = document.createElement('div'); document.body.appendChild(host)
    app = createApp(App); app.use(pinia); app.use(router); app.mount(host)
    await waitFor(() => host.textContent.includes('App Locked'), 'biometric lock did not appear')
    check(!host.querySelector('[data-status-banner]'), 'health banner visible through biometric lock')
    ;[...host.querySelectorAll('button')].find(button => button.textContent.trim() === 'Unlock with PIN').click()
    await nextTick()
    check(host.textContent.includes('Enter PIN') && !host.querySelector('[data-status-banner]'), 'PIN fallback exposed banner')
    for (const digit of '123456') {
      ;[...host.querySelectorAll('button')].find(button => button.textContent.trim() === digit).click()
      await nextTick()
    }
    await waitFor(() => host.querySelector('[data-status-banner]'), 'health banner did not return after PIN unlock')
    const originalNow = Date.now
    try {
      Date.now = () => originalNow() + 6 * 60 * 1000
      document.dispatchEvent(new Event('visibilitychange'))
      await nextTick()
    } finally {
      Date.now = originalNow
    }
    check(host.textContent.includes('App Locked') && !host.querySelector('[data-status-banner]'), 'inactivity lock exposed banner')
    check(document.documentElement.style.getPropertyValue('--status-banner-height') === '0px', 'locking retained banner offset')
    app.unmount(); app = null; host.remove(); host = null
    passed.push('app biometric gate, PIN fallback, unlock and inactivity lock hide health banners')
  } finally {
    app?.unmount()
    host?.remove()
    frame?.remove()
    health.stop()
    health.stop()
    HTMLAnchorElement.prototype.click = originalAnchorClick
    URL.createObjectURL = originalCreateUrl
    db.books.toArray = originalBooksRead
    db.settings.bulkPut = originalSettingsWrite
    globalThis.fetch = originalFetch
    if (storageDescriptor) Object.defineProperty(navigator, 'storage', storageDescriptor)
    else delete navigator.storage
    await db.settings.bulkDelete(BACKUP_SETTING_KEYS)
  }
  return passed
}
