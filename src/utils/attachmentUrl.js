// Local attachment refs.
//
// A photo taken while offline cannot have a server URL yet. Instead of blocking
// the user, the compressed blob is stored in `upload_queue` and the record holds
// `local:<uuid>`. This module owns the mapping from those refs to object URLs so
// thumbnails render immediately, and survives a reload by rehydrating from the
// queue.

import { reactive } from "vue"

import { db } from "@/db/dexie"

export const LOCAL_ATTACHMENT_PREFIX = "local:"

// Reactive so a thumbnail updates once its blob is registered (or released).
const objectUrls = reactive(new Map())
// Refs uploaded while a form is still open keep showing their picture: the
// preview switches from the blob to the server URL instead of disappearing.
const resolvedUrls = reactive(new Map())

export function isLocalAttachment(url) {
  return typeof url === "string" && url.startsWith(LOCAL_ATTACHMENT_PREFIX)
}

export function newLocalAttachmentRef() {
  const id =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${LOCAL_ATTACHMENT_PREFIX}${id}`
}

export function localAttachmentUrl(ref) {
  return resolvedUrls.get(ref) || objectUrls.get(ref) || ""
}

export function markAttachmentUploaded(ref, url) {
  if (!ref || !url) return
  resolvedUrls.set(ref, url)
  releaseAttachmentBlob(ref)
}

export function registerAttachmentBlob(ref, blob) {
  if (!ref || !blob) return ""

  const existing = objectUrls.get(ref)
  if (existing) return existing

  const url = URL.createObjectURL(blob)
  objectUrls.set(ref, url)
  return url
}

export function releaseAttachmentBlob(ref) {
  const url = objectUrls.get(ref)
  if (!url) return

  URL.revokeObjectURL(url)
  objectUrls.delete(ref)
}

// Called before the app mounts so thumbnails have a source on the first render.
export async function hydrateLocalAttachments() {
  try {
    const rows = await db.upload_queue.toArray()
    for (const row of rows) {
      if (row.blob) registerAttachmentBlob(row.ref, row.blob)
    }
  } catch (e) {
    // A missing queue table (first run on an older schema) is not fatal.
    console.error("Failed to restore queued photos", e)
  }
}
