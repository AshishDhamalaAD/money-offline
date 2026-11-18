import { getApiToken } from '@/utils/secureStore'
// Upload transport.
//
// Kept separate from uploadService so the offline queue can reuse it without a
// circular import. Errors are tagged so the queue knows whether retrying makes
// sense: a rejected token or an oversized file will never succeed on its own.

import { db } from "@/db/dexie"
import { UPLOAD_IMAGE_API_URL } from "@/constants/routes"

const UPLOAD_TIMEOUT_MS = 60000

function permanentError(message) {
  const error = new Error(message)
  error.permanent = true
  return error
}

export async function uploadBlob(blob, from, name = "image.jpg", type = blob?.type || "image/jpeg") {
  const endpoint = await db.settings.get("apiEndpoint")
  const token = await getApiToken()

  if (!endpoint || !endpoint.value) {
    throw permanentError("API Endpoint not configured")
  }

  if (!token) {
    throw permanentError("API Token not configured")
  }

  const formData = new FormData()
  formData.append("image", blob, name)
  formData.append("from", from)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

  let response
  try {
    response = await fetch(`${endpoint.value}${UPLOAD_IMAGE_API_URL}`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "X-TOKEN": token,
      },
      body: formData,
      signal: controller.signal,
    })
  } catch (e) {
    // Offline, DNS failure, abort: all worth retrying later.
    throw new Error(e?.message || "Could not reach the server")
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const retryable =
      response.status >= 500 || response.status === 408 || response.status === 429
    const message = `Upload failed: ${response.status} ${response.statusText}`.trim()

    if (retryable) throw new Error(message)
    throw permanentError(message)
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error("The server returned an unreadable upload response")
  }

  if (!data || typeof data.url !== "string" || !data.url) {
    throw permanentError("The server did not return an image URL")
  }

  return data.url
}
