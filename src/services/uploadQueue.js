import { withSyncLock } from '@/db/sync/lock'
// Offline photo queue.
//
// A photo is compressed, stored as a blob and referenced from the record as
// `local:<uuid>`. The queue uploads it as soon as the app is online, rewrites
// every record that still holds the ref, and lets sync run. While a local ref
// remains in the database, sync is deferred so the server never receives one.

import { ref } from "vue"

import { db } from "@/db/dexie"
import { uploadBlob } from "@/services/uploadTransport"
import { formatDateTimeForDB } from "@/utils/dateUtils"
import { compressImage } from "@/utils/imageCompression"
import {
  isLocalAttachment,
  newLocalAttachmentRef,
  registerAttachmentBlob,
  releaseAttachmentBlob,
  markAttachmentUploaded,
  hydrateLocalAttachments,
} from "@/utils/attachmentUrl"

// A phone should not quietly fill its storage with photos it can never send.
export const MAX_QUEUED_UPLOADS = 20
export const MAX_QUEUE_BYTES = 40 * 1024 * 1024

// Done rows stay a little while so a form opened before the upload finished can
// still resolve the ref it is holding when it saves.
const RESOLVED_RETENTION_MS = 24 * 60 * 60 * 1000
const MAX_RESOLVED_ROWS = 100

export const uploadQueueState = ref({ queued: 0, failed: 0, uploading: false })

let processing = null

function nowIso() {
  return new Date().toISOString()
}

function isActive(row) {
  return row.status === "queued" || row.status === "uploading"
}

export async function refreshQueueState() {
  const rows = await db.upload_queue.toArray()
  let queued = 0
  let failed = 0
  let uploading = false

  for (const row of rows) {
    if (isActive(row)) {
      queued += 1
      if (row.status === "uploading") uploading = true
    } else if (row.status === "failed") {
      failed += 1
    }
  }

  uploadQueueState.value = { queued, failed, uploading }
  return uploadQueueState.value
}

async function storeCompressedUpload(upload, from, bookId) {
  let localRef
  await db.transaction('rw', db.upload_queue, async () => {
    const rows = await db.upload_queue.toArray()
    const active = rows.filter(row => isActive(row) || row.status === "failed")

    if (active.length >= MAX_QUEUED_UPLOADS) {
      throw new Error(
        `Too many photos are waiting to upload (limit ${MAX_QUEUED_UPLOADS}). Reconnect and try again.`,
      )
    }

    const bytes = active.reduce((sum, row) => sum + (row.size || 0), 0)
    if (bytes + (upload.size || 0) > MAX_QUEUE_BYTES) {
      throw new Error("The photo queue is full (40 MB). Reconnect and try again.")
    }

    localRef = newLocalAttachmentRef()

    await db.upload_queue.add({
      ref: localRef,
      book_id: bookId || null,
      from,
      name: upload.name || "image.jpg",
      type: upload.type || "image/jpeg",
      size: upload.size || 0,
      blob: upload,
      status: "queued",
      attempts: 0,
      error: "",
      url: "",
      created_at: nowIso(),
      updated_at: nowIso(),
    })

  })
  registerAttachmentBlob(localRef, upload)
  await refreshQueueState()

  return localRef
}

// Queue a raw file (compress first). Used when the app knows it is offline.
export async function enqueueUpload(file, from, bookId) {
  const upload = await compressImage(file)
  return storeCompressedUpload(upload, from, bookId)
}

// Queue a file that was already compressed for a direct upload attempt.
export async function enqueueCompressedUpload(upload, from, bookId) {
  return storeCompressedUpload(upload, from, bookId)
}

async function absoluteAttachmentUrl(path) {
  const endpoint = await db.settings.get("apiEndpoint")
  return `${endpoint?.value || ""}/storage/${path}`
}

async function replaceLocalRef(localRef, url) {
  const transactions = await db.transactions
    .filter(row => Array.isArray(row.attachments) && row.attachments.includes(localRef))
    .toArray()

  for (const row of transactions) {
    await db.transactions.update(row.id, {
      attachments: row.attachments.map(item => (item === localRef ? url : item)).filter(Boolean),
      updated_at: formatDateTimeForDB(),
      sync_status: "pending",
    })
  }

  const products = await db.products
    .filter(row => Array.isArray(row.attachments) && row.attachments.includes(localRef))
    .toArray()

  for (const row of products) {
    await db.products.update(row.id, {
      attachments: row.attachments.map(item => (item === localRef ? url : item)).filter(Boolean),
      updated_at: formatDateTimeForDB(),
      sync_status: "pending",
    })
  }
  await db.trash.filter(entry => entry.row?.attachments?.includes(localRef)).modify(entry => {
    entry.row.attachments = entry.row.attachments.map(item => item === localRef ? url : item).filter(Boolean)
  })
}

async function purgeResolvedUploads() {
  const done = await db.upload_queue.where("status").equals("done").toArray()
  if (done.length === 0) return

  const cutoff = Date.now() - RESOLVED_RETENTION_MS
  const stale = done
    .filter(row => (row.resolved_at || 0) < cutoff)
    .map(row => row.id)

  // Keep the newest few even if something goes wrong with the clock.
  const overflow = done
    .filter(row => !stale.includes(row.id))
    .sort((a, b) => (b.resolved_at || 0) - (a.resolved_at || 0))
    .slice(MAX_RESOLVED_ROWS)
    .map(row => row.id)

  const remove = [...stale, ...overflow]
  if (remove.length > 0) await db.upload_queue.bulkDelete(remove)
}

// Single-flight: start, online and a manual sync can all ask at once.
export function processQueue() {
  if (processing) return processing

  processing = withSyncLock(async () => {
    await hydrateLocalAttachments()

    const rows = await db.upload_queue.toArray()
    // Reconcile completed rows after a crash or a form saved during upload.
    for (const row of rows.filter(row => row.status === 'done' && row.url)) {
      await replaceLocalRef(row.ref, row.url)
      markAttachmentUploaded(row.ref, await absoluteAttachmentUrl(row.url))
    }
    const pending = rows
      .filter(isActive)
      .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))

    let uploaded = 0

    for (const row of pending) {
      if (row.book_id && !(await db.books.get(row.book_id))) {
        await discardQueuedUploads([row.ref])
        continue
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) break
      if (!row.blob) {
        await db.upload_queue.update(row.id, {
          status: "failed",
          error: "The saved photo is missing from this device",
          updated_at: nowIso(),
        })
        continue
      }

      await db.upload_queue.update(row.id, { status: "uploading", updated_at: nowIso() })
      await refreshQueueState()

      try {
        const url = await uploadBlob(row.blob, row.from, row.name, row.type)
        await db.transaction('rw', db.upload_queue, db.transactions, db.products, db.trash, async () => {
          await db.upload_queue.update(row.id, {
            status: "done",
            url,
            blob: null,
            error: "",
            resolved_at: Date.now(),
            updated_at: nowIso(),
          })
          await replaceLocalRef(row.ref, url)
        })
        markAttachmentUploaded(row.ref, await absoluteAttachmentUrl(url))
        uploaded += 1
      } catch (e) {
        const permanent = Boolean(e?.permanent)
        await db.upload_queue.update(row.id, {
          status: permanent ? "failed" : "queued",
          attempts: (row.attempts || 0) + 1,
          error: e?.message || "Upload failed",
          updated_at: nowIso(),
        })

        // A dead connection should not be hammered photo after photo.
        if (!permanent) break
      }
    }

    await purgeResolvedUploads()
    const state = await refreshQueueState()

    return { uploaded, ...state }
  }).finally(() => {
    processing = null
  })

  return processing
}

// Called when a form saves: photos uploaded while the user was still editing
// are already on the server, so swap their refs for the real URLs.
export async function resolveAttachmentRefs(urls = []) {
  if (!Array.isArray(urls) || !urls.some(isLocalAttachment)) return urls

  const refs = urls.filter(isLocalAttachment)
  const rows = await db.upload_queue.where("ref").anyOf(refs).toArray()
  const resolved = new Map(
    rows.filter(row => row.status === "done" && row.url).map(row => [row.ref, row.url]),
  )

  if (resolved.size === 0) return urls

  return urls.map(url => (isLocalAttachment(url) && resolved.get(url)) || url)
}

// Any record that still points at a local blob must not be sent to the server.
export async function countLocalAttachmentRefs() {
  let count = 0

  await db.transactions
    .filter(row => Array.isArray(row.attachments) && row.attachments.some(isLocalAttachment))
    .each(() => {
      count += 1
    })

  await db.products
    .filter(row => Array.isArray(row.attachments) && row.attachments.some(isLocalAttachment))
    .each(() => {
      count += 1
    })

  return count
}

// Deleting a book (or removing a photo) must not leave blobs behind.
export async function discardQueuedUploads(urls = []) {
  const refs = (urls || []).filter(isLocalAttachment)
  if (refs.length === 0) return

  const rows = await db.upload_queue.where("ref").anyOf(refs).toArray()
  await db.transaction('rw', db.upload_queue, db.transactions, db.products, db.trash, async () => {
    for (const row of rows) {
      await replaceLocalRef(row.ref, null)
      await db.upload_queue.delete(row.id)
    }
  })
  for (const row of rows) releaseAttachmentBlob(row.ref)

  await refreshQueueState()
}

export async function retryFailedUploads() {
  await db.upload_queue.toCollection().modify(row => {
    if (row.status === "failed") {
      row.status = "queued"
      row.error = ""
      row.updated_at = nowIso()
    }
  })

  await refreshQueueState()
}

// Removing a photo from an unsaved form must preserve any saved row that still
// uses it. Once no active record or Trash snapshot needs it, release its blob.
export function discardUnusedUploads(urls = []) {
  return withSyncLock(async () => {
    for (const localRef of urls.filter(isLocalAttachment)) {
      const used = await db.transactions.filter(row => row.attachments?.includes(localRef)).count()
        || await db.products.filter(row => row.attachments?.includes(localRef)).count()
        || await db.trash.filter(entry => entry.row?.attachments?.includes(localRef)).count()
      if (!used) await discardQueuedUploads([localRef])
    }
  })
}
