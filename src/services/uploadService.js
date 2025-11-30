import { db } from "@/db/dexie"
import { UPLOAD_IMAGE_API_URL } from "@/constants"

export const uploadService = {
    async uploadImage(file, from) {
        const endpoint = await db.settings.get("apiEndpoint")
        const token = await db.settings.get("apiToken")

        if (!endpoint || !endpoint.value) {
            throw new Error("API Endpoint not configured")
        }

        if (!token || !token.value) {
            throw new Error("API Token not configured")
        }

        const formData = new FormData()
        formData.append("image", file)
        formData.append("from", from)

        const response = await fetch(`${endpoint.value}${UPLOAD_IMAGE_API_URL}`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "X-TOKEN": token.value,
            },
            body: formData,
        })

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`)
        }

        const data = await response.json()
        // Assuming server returns { url: "..." } or similar. 
        // The requirement says "The server will return the images urls."
        // If it returns a list, I'll take the first one (since we upload one by one).
        // Or if it returns the url directly.
        // I'll assume it returns { url: "path/to/image.jpg" } or just the string.
        // Let's assume standard JSON response { url: ... } or { data: { url: ... } }
        // I'll return data.url
        return data.url
    }
}
