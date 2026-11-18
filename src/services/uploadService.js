import { compressImage } from "@/utils/imageCompression"
import { enqueueCompressedUpload, enqueueUpload } from "@/services/uploadQueue"
import { uploadBlob } from "@/services/uploadTransport"

export const uploadService = {
    async uploadImage(file, from, bookId) {
        // Offline is not an error any more: the photo is stored on the device
        // and referenced as `local:<uuid>` until the queue can send it.
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            return enqueueUpload(file, from, bookId)
        }

        // Both the camera button and FilePond come through here, so resizing
        // once at this point covers every upload path.
        const upload = await compressImage(file)

        try {
            return await uploadBlob(upload, from, upload.name || "image.jpg", upload.type)
        } catch (e) {
            // A rejected token or a missing endpoint will never succeed by
            // itself, so surface it instead of silently queueing.
            if (e?.permanent) throw e

            // The connection dropped mid-request: keep the photo.
            return enqueueCompressedUpload(upload, from, bookId)
        }
    },
}
