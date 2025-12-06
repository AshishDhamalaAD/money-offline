import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db/dexie'

export const useSettingsStore = defineStore('settings', () => {
    const apiEndpoint = ref("")
    const apiToken = ref("")
    const biometricEnabled = ref(false)
    const biometricCredentialId = ref(null)
    const initialized = ref(false)
    const themePreference = ref("system")
    let systemMediaQuery = null

    async function init() {
        if (initialized.value) return
        try {
            const [endpoint, token, bioEnabled, bioCredId, theme] = await Promise.all([
                db.settings.get("apiEndpoint"),
                db.settings.get("apiToken"),
                db.settings.get("biometricEnabled"),
                db.settings.get("biometricCredentialId"),
                db.settings.get("themePreference")
            ])

            if (endpoint) apiEndpoint.value = endpoint.value
            if (token) apiToken.value = token.value
            if (bioEnabled) biometricEnabled.value = bioEnabled.value
            if (bioCredId) biometricCredentialId.value = bioCredId.value
            if (theme?.value) themePreference.value = theme.value

            applyTheme(themePreference.value)
        } catch (e) {
            console.error("Failed to load settings", e)
        } finally {
            initialized.value = true
        }
    }

    async function saveSettings(endpoint, token) {
        try {
            await db.settings.put({ key: "apiEndpoint", value: endpoint })
            await db.settings.put({ key: "apiToken", value: token })
            apiEndpoint.value = endpoint
            apiToken.value = token
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

    function applyTheme(preference = themePreference.value) {
        if (typeof document === "undefined") return
        const resolvedTheme = resolveTheme(preference)
        const root = document.documentElement

        root.classList.toggle("dark", resolvedTheme === "dark")
        root.dataset.theme = preference
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

    return {
        apiEndpoint,
        apiToken,
        biometricEnabled,
        biometricCredentialId,
        initialized,
        themePreference,
        init,
        saveSettings,
        registerBiometric,
        verifyBiometric,
        disableBiometric,
        setThemePreference,
        applyTheme,
        resolveTheme
    }
})
