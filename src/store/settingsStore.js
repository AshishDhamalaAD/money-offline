import { migrateSecrets, getApiToken, setApiToken, setPin, verifyPin, secureStorageAvailable } from '@/utils/secureStore'
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db/dexie'
import { patchSyncState, resetSyncState } from '@/db/sync/state'
import { BACKUP_INTERVALS, BACKUP_SETTING_KEYS, DAY_MS } from '@/utils/backupHealth'
import {
    appLocale,
    calendarSystem,
    applyCalendarSystem,
    applyLocale,
    normalizeCalendarSystem,
    normalizeLocale,
} from '@/utils/locale'

export const useSettingsStore = defineStore('settings', () => {
    const apiEndpoint = ref("")
    const apiToken = ref("")
    // 'dump' is the original full-backup upload. 'incremental' needs the newer
    // server endpoints, so it stays opt-in until the backend supports them.
    const syncMode = ref("dump")
    const biometricEnabled = ref(false)
    const biometricCredentialId = ref(null)
    const pinEnabled = ref(false)
    const pinLockout = ref({ failures: 0, level: 0, until: 0 })
    const securityWarning = ref(secureStorageAvailable ? '' : 'Secure storage is unavailable. Use HTTPS to hash your PIN and encrypt your API token. New secrets are stored as plaintext until then.')
    let verifyingPin = null
    const autoLockTimeout = ref(0) // 0 means immediate/on-startup, others are minutes
    const initialized = ref(false)
    const loadError = ref('')
    let initialization = null
    const themePreference = ref("system")
    const remindersEnabled = ref(false)
    const reminderTime = ref("09:00")
    const reminderLastShown = ref("")
    const lastBackupGeneratedAt = ref(null)
    const backupReminderIntervalDays = ref(0)
    const backupReminderSnoozedUntil = ref(0)
    const storageWarningSnoozedUntil = ref(0)
    const backupSettings = { lastBackupGeneratedAt, backupReminderIntervalDays, backupReminderSnoozedUntil, storageWarningSnoozedUntil }
    let systemMediaQuery = null

    function applyBackupSettings(rows) {
        const values = Object.fromEntries(rows.filter(Boolean).map(row => [row.key, row.value]))
        const timestamp = values.lastBackupGeneratedAt
        lastBackupGeneratedAt.value = typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp)) ? timestamp : null
        backupReminderIntervalDays.value = BACKUP_INTERVALS.includes(values.backupReminderIntervalDays) ? values.backupReminderIntervalDays : 0
        for (const key of ['backupReminderSnoozedUntil', 'storageWarningSnoozedUntil']) {
            backupSettings[key].value = Number.isFinite(values[key]) && values[key] > 0 ? values[key] : 0
        }
    }

    async function refreshBackupSettings() {
        applyBackupSettings(await db.settings.bulkGet(BACKUP_SETTING_KEYS))
    }

    async function saveBackupSettings(values) {
        try {
            // bulkPut commits the timestamp and snooze changes together.
            await db.settings.bulkPut(Object.entries(values).map(([key, value]) => ({ key, value })))
            for (const [key, value] of Object.entries(values)) backupSettings[key].value = value
            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    function setBackupReminderInterval(value) {
        const days = Number(value)
        if (!BACKUP_INTERVALS.includes(days)) return Promise.resolve({ success: false, message: 'Choose Off, 7, 14 or 30 days.' })
        return saveBackupSettings({ backupReminderIntervalDays: days, backupReminderSnoozedUntil: 0 })
    }

    function recordBackupGenerated() {
        return saveBackupSettings({ lastBackupGeneratedAt: new Date().toISOString(), backupReminderSnoozedUntil: 0 })
    }

    function snoozeBackupReminder() {
        return saveBackupSettings({ backupReminderSnoozedUntil: Date.now() + DAY_MS })
    }

    function snoozeStorageWarning() {
        return saveBackupSettings({ storageWarningSnoozedUntil: Date.now() + DAY_MS })
    }

    function init() {
        if (initialized.value) return Promise.resolve(true)
        if (!initialization) initialization = loadSettings().finally(() => { initialization = null })
        return initialization
    }

    async function loadSettings() {
        loadError.value = ''
        try {
            await migrateSecrets().catch(error => { securityWarning.value = error.message })
            const [endpoint, token, bioEnabled, bioCredId, pinEn, pin, timeout, theme, reminders, reminderAt, reminderShown, mode, savedLocale, savedCalendar] = await Promise.all([
                db.settings.get("apiEndpoint"),
                getApiToken().catch(error => { securityWarning.value = error.message; return "" }),
                db.settings.get("biometricEnabled"),
                db.settings.get("biometricCredentialId"),
                db.settings.get("pinEnabled"),
                db.settings.get("pinLockout"),
                db.settings.get("autoLockTimeout"),
                db.settings.get("themePreference"),
                db.settings.get("remindersEnabled"),
                db.settings.get("reminderTime"),
                db.settings.get("reminderLastShown"),
                db.settings.get("syncMode"),
                db.settings.get("locale"),
                db.settings.get("calendarSystem")
            ])

            if (endpoint) apiEndpoint.value = endpoint.value
            apiToken.value = token
            if (bioEnabled) biometricEnabled.value = bioEnabled.value
            if (bioCredId) biometricCredentialId.value = bioCredId.value
            if (pinEn) pinEnabled.value = pinEn.value
            if (pin) pinLockout.value = pin.value
            if (timeout) autoLockTimeout.value = timeout.value
            if (theme?.value) themePreference.value = theme.value
            if (reminders) remindersEnabled.value = Boolean(reminders.value)
            if (reminderAt?.value) reminderTime.value = reminderAt.value
            if (reminderShown?.value) reminderLastShown.value = reminderShown.value
            if (mode?.value === "incremental") syncMode.value = "incremental"

            await refreshBackupSettings()

            applyLocale(savedLocale?.value)
            applyCalendarSystem(savedCalendar?.value)

            applyTheme(themePreference.value)
            initialized.value = true
            return true
        } catch (e) {
            console.error("Failed to load settings", e)
            loadError.value = 'Could not load device settings. Retry loading or reload the app. Your records have not been reset.'
            return false
        }
    }

    async function saveSettings(endpoint, token) {
        try {
            const savedEndpoint = (await db.settings.get("apiEndpoint"))?.value || ""
            const savedToken = await getApiToken().catch(() => null)
            const changed = savedEndpoint !== endpoint || savedToken !== token

            await db.settings.put({ key: "apiEndpoint", value: endpoint })
            if (savedToken !== token) await setApiToken(token)
            apiEndpoint.value = endpoint
            apiToken.value = token

            // A new server means the old pull cursor is meaningless.
            if (changed) await resetSyncState()

            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    async function setSyncMode(mode) {
        try {
            const value = mode === "incremental" ? "incremental" : "dump"

            await db.settings.put({ key: "syncMode", value })
            syncMode.value = value

            // Choosing incremental is an explicit "my server supports this now",
            // so forget a fallback detected during an earlier attempt and probe
            // the changes endpoint again on the next sync.
            if (value === "incremental") await patchSyncState({ protocol: "unknown" })

            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    function bufferToBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    }

    function base64ToBuffer(base64) {
        const binaryString = atob(base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes.buffer
    }

    async function registerBiometric() {
        try {
            if (!window.PublicKeyCredential) {
                throw new Error("WebAuthn not supported")
            }

            const publicKey = {
                challenge: new Uint8Array(32),
                rp: { name: "Money App" },
                user: {
                    id: new Uint8Array(16),
                    name: "user@local",
                    displayName: "User"
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                },
                timeout: 60000
            }

            const credential = await navigator.credentials.create({ publicKey })
            const credentialId = bufferToBase64(credential.rawId)

            await db.settings.put({ key: "biometricEnabled", value: true })
            await db.settings.put({ key: "biometricCredentialId", value: credentialId })

            biometricEnabled.value = true
            biometricCredentialId.value = credentialId

            return { success: true }
        } catch (error) {
            console.error("Biometric registration failed:", error)
            return { success: false, message: error.message }
        }
    }

    async function verifyBiometric() {
        try {
            if (!biometricCredentialId.value) {
                throw new Error("No biometric credential found")
            }

            const publicKey = {
                challenge: new Uint8Array(32),
                allowCredentials: [{
                    type: "public-key",
                    id: base64ToBuffer(biometricCredentialId.value),
                    transports: ["internal"]
                }],
                userVerification: "required"
            }

            await navigator.credentials.get({ publicKey })
            return { success: true }
        } catch (error) {
            console.error("Biometric verification failed:", error)
            return { success: false, message: error.message }
        }
    }

    async function disableBiometric() {
        try {
            await db.settings.put({ key: "biometricEnabled", value: false })
            await db.settings.put({ key: "biometricCredentialId", value: null })
            biometricEnabled.value = false
            biometricCredentialId.value = null
            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    async function savePinCode(pin) {
        try {
            await setPin(pin)
            await db.settings.put({ key: "pinEnabled", value: true })
            await resetPinLockout()
            pinEnabled.value = true
            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    async function resetPinLockout() {
        pinLockout.value = { failures: 0, level: 0, until: 0 }
        await db.settings.put({ key: 'pinLockout', value: { ...pinLockout.value } })
    }

    function verifyPinCode(pin) {
        if (verifyingPin) return Promise.resolve(false)
        const work = async () => {
            const state = (await db.settings.get('pinLockout'))?.value || { failures: 0, level: 0, until: 0 }
            pinLockout.value = state
            if (state.until > Date.now()) return false
            const valid = await verifyPin(pin)
            if (valid) await resetPinLockout()
            else {
                const next = { ...state, failures: (state.failures || 0) + 1 }
                if (next.failures >= 5) {
                    next.until = Date.now() + Math.min(300000, 30000 * 2 ** (state.level || 0))
                    next.level = Math.min(4, (state.level || 0) + 1)
                    next.failures = 0
                }
                pinLockout.value = next
                await db.settings.put({ key: 'pinLockout', value: next })
            }
            return valid
        }
        verifyingPin = (globalThis.navigator?.locks
            ? navigator.locks.request('money-pin-verification', work)
            : work()).finally(() => { verifyingPin = null })
        return verifyingPin
    }

    async function disablePin() {
        try {
            await db.settings.put({ key: "pinEnabled", value: false })
            await db.settings.bulkDelete(['pinCode', 'pinHash'])
            await resetPinLockout()
            await disableBiometric() // PIN is required for biometric
            pinEnabled.value = false
            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    function resolveTheme(preference = themePreference.value) {
        if (preference === "dark" || preference === "light") return preference

        if (!systemMediaQuery && typeof window !== "undefined") {
            systemMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
            systemMediaQuery.addEventListener("change", () => {
                if (themePreference.value === "system") {
                    applyTheme("system")
                }
            })
        }

        return systemMediaQuery?.matches ? "dark" : "light"
    }

    function updateThemeColor(resolvedTheme) {
        const meta = document.querySelector('meta[name="theme-color"]')
        if (!meta) return

        // Read the resolved body background so the browser chrome always matches
        // the theme actually applied, instead of duplicating colour values.
        const background = getComputedStyle(document.body).backgroundColor
        const hasBackground = background && background !== "transparent" && background !== "rgba(0, 0, 0, 0)"

        meta.setAttribute("content", hasBackground ? background : resolvedTheme === "dark" ? "#030712" : "#ffffff")
    }

    function applyTheme(preference = themePreference.value) {
        if (typeof document === "undefined") return
        const resolvedTheme = resolveTheme(preference)
        const root = document.documentElement

        root.classList.toggle("dark", resolvedTheme === "dark")
        root.dataset.theme = preference
        updateThemeColor(resolvedTheme)
    }

    async function setThemePreference(preference) {
        try {
            themePreference.value = preference
            await db.settings.put({ key: "themePreference", value: preference })
            applyTheme(preference)
            return { success: true }
        } catch (error) {
            console.error("Failed to save theme preference", error)
            return { success: false, message: error.message }
        }
    }

    async function setLocale(value) {
        const next = normalizeLocale(value)
        try {
            await db.settings.put({ key: "locale", value: next })
            applyLocale(next)
            return { success: true }
        } catch (error) {
            console.error("Failed to save locale", error)
            return { success: false, message: error.message }
        }
    }

    async function setCalendarSystem(value) {
        const next = normalizeCalendarSystem(value)
        try {
            await db.settings.put({ key: "calendarSystem", value: next })
            applyCalendarSystem(next)
            return { success: true }
        } catch (error) {
            console.error("Failed to save calendar", error)
            return { success: false, message: error.message }
        }
    }

    async function setAutoLockTimeout(minutes) {
        try {
            await db.settings.put({ key: "autoLockTimeout", value: minutes })
            autoLockTimeout.value = minutes
            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    async function setRemindersEnabled(enabled) {
        try {
            await db.settings.put({ key: "remindersEnabled", value: Boolean(enabled) })
            remindersEnabled.value = Boolean(enabled)

            // Turning reminders on should be able to notify later the same day.
            if (enabled) await markReminderShown("")

            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    async function setReminderTime(time) {
        try {
            const value = /^\d{2}:\d{2}$/.test(time) ? time : "09:00"
            await db.settings.put({ key: "reminderTime", value })
            reminderTime.value = value
            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    async function markReminderShown(date) {
        try {
            await db.settings.put({ key: "reminderLastShown", value: date || "" })
            reminderLastShown.value = date || ""
            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    return {
        apiEndpoint,
        apiToken,
        syncMode,
        biometricEnabled,
        biometricCredentialId,
        pinEnabled,
        pinLockout,
        securityWarning,
        autoLockTimeout,
        initialized,
        loadError,
        themePreference,
        locale: appLocale,
        calendarSystem,
        remindersEnabled,
        reminderTime,
        reminderLastShown,
        lastBackupGeneratedAt,
        backupReminderIntervalDays,
        backupReminderSnoozedUntil,
        storageWarningSnoozedUntil,
        applyBackupSettings,
        refreshBackupSettings,
        setBackupReminderInterval,
        recordBackupGenerated,
        snoozeBackupReminder,
        snoozeStorageWarning,
        init,
        saveSettings,
        setSyncMode,
        registerBiometric,
        verifyBiometric,
        disableBiometric,
        savePinCode,
        verifyPinCode,
        disablePin,
        setAutoLockTimeout,
        setThemePreference,
        setLocale,
        setCalendarSystem,
        setRemindersEnabled,
        setReminderTime,
        markReminderShown,
        applyTheme,
        resolveTheme
    }
})
