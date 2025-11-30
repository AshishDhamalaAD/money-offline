import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db/dexie'

export const useSettingsStore = defineStore('settings', () => {
    const apiEndpoint = ref("")
    const apiToken = ref("")
    const biometricEnabled = ref(false)
    const biometricCredentialId = ref(null)
    const initialized = ref(false)

    async function init() {
        if (initialized.value) return
        try {
            const endpoint = await db.settings.get("apiEndpoint")
            const token = await db.settings.get("apiToken")
            const bioEnabled = await db.settings.get("biometricEnabled")
            const bioCredId = await db.settings.get("biometricCredentialId")

            if (endpoint) apiEndpoint.value = endpoint.value
            if (token) apiToken.value = token.value
            if (bioEnabled) biometricEnabled.value = bioEnabled.value
            if (bioCredId) biometricCredentialId.value = bioCredId.value
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

    // Helper to convert ArrayBuffer to Base64
    function bufferToBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    }

    // Helper to convert Base64 to Uint8Array
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
                challenge: new Uint8Array(32), // Random challenge
                rp: { name: "Money App" },
                user: {
                    id: new Uint8Array(16),
                    name: "user@local",
                    displayName: "User"
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // Use platform authenticator (TouchID, FaceID, Windows Hello)
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

    return {
        apiEndpoint,
        apiToken,
        biometricEnabled,
        biometricCredentialId,
        initialized,
        init,
        saveSettings,
        registerBiometric,
        verifyBiometric,
        disableBiometric
    }
})
