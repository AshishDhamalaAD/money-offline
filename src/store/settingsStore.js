import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db/dexie'
import { patchSyncState, resetSyncState } from '@/db/sync/state'

export const useSettingsStore = defineStore('settings', () => {
    const apiEndpoint = ref("")
    const apiToken = ref("")
    // 'dump' is the original full-backup upload. 'incremental' needs the newer
    // server endpoints, so it stays opt-in until the backend supports them.
    const syncMode = ref("dump")
    const biometricEnabled = ref(false)
    const biometricCredentialId = ref(null)
    const pinEnabled = ref(false)
    const pinCode = ref(null)
    const autoLockTimeout = ref(0) // 0 means immediate/on-startup, others are minutes
    const initialized = ref(false)
    const themePreference = ref("system")
    const remindersEnabled = ref(false)
    const reminderTime = ref("09:00")
    const reminderLastShown = ref("")
    let systemMediaQuery = null

    async function init() {
        if (initialized.value) return
        try {
            const [endpoint, token, bioEnabled, bioCredId, pinEn, pin, timeout, theme, reminders, reminderAt, reminderShown, mode] = await Promise.all([
                db.settings.get("apiEndpoint"),
                db.settings.get("apiToken"),
                db.settings.get("biometricEnabled"),
                db.settings.get("biometricCredentialId"),
                db.settings.get("pinEnabled"),
                db.settings.get("pinCode"),
                db.settings.get("autoLockTimeout"),
                db.settings.get("themePreference"),
                db.settings.get("remindersEnabled"),
                db.settings.get("reminderTime"),
                db.settings.get("reminderLastShown"),
                db.settings.get("syncMode")
            ])

            if (endpoint) apiEndpoint.value = endpoint.value
            if (token) apiToken.value = token.value
            if (bioEnabled) biometricEnabled.value = bioEnabled.value
            if (bioCredId) biometricCredentialId.value = bioCredId.value
            if (pinEn) pinEnabled.value = pinEn.value
            if (pin) pinCode.value = pin.value
            if (timeout) autoLockTimeout.value = timeout.value
            if (theme?.value) themePreference.value = theme.value
            if (reminders) remindersEnabled.value = Boolean(reminders.value)
            if (reminderAt?.value) reminderTime.value = reminderAt.value
            if (reminderShown?.value) reminderLastShown.value = reminderShown.value
            if (mode?.value === "incremental") syncMode.value = "incremental"

            applyTheme(themePreference.value)
        } catch (e) {
            console.error("Failed to load settings", e)
        } finally {
            initialized.value = true
        }
    }

    async function saveSettings(endpoint, token) {
        try {
            const changed = apiEndpoint.value !== endpoint || apiToken.value !== token

            await db.settings.put({ key: "apiEndpoint", value: endpoint })
            await db.settings.put({ key: "apiToken", value: token })
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
            await db.settings.put({ key: "pinEnabled", value: true })
            await db.settings.put({ key: "pinCode", value: pin })
            pinEnabled.value = true
            pinCode.value = pin
            return { success: true }
        } catch (error) {
            return { success: false, message: error.message }
        }
    }

    async function verifyPinCode(pin) {
        return pinCode.value === pin
    }

    async function disablePin() {
        try {
            await db.settings.put({ key: "pinEnabled", value: false })
            await db.settings.put({ key: "pinCode", value: null })
            await disableBiometric() // PIN is required for biometric
            pinEnabled.value = false
            pinCode.value = null
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
        pinCode,
        autoLockTimeout,
        initialized,
        themePreference,
        remindersEnabled,
        reminderTime,
        reminderLastShown,
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
        setRemindersEnabled,
        setReminderTime,
        markReminderShown,
        applyTheme,
        resolveTheme
    }
})
