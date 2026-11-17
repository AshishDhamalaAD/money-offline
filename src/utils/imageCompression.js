// Client-side image compression before upload.
//
// Phone cameras produce 4-12 MB photos. Uploading them untouched is slow on
// mobile data and stores images that are only ever shown a few hundred pixels
// wide. We redraw the image on a canvas with its long edge capped and re-encode
// it as JPEG, keeping PNG only when the source actually has transparency.
//
// Everything here is best-effort: an unsupported format (for example HEIC), a
// decode failure, or a result that is not smaller than the original all fall
// back to the untouched file so the upload still works.

const MAX_EDGE = 1600
const JPEG_QUALITY = 0.8
// Files this small are already fine; re-encoding would only cost time.
const SKIP_BELOW_BYTES = 250 * 1024
// Animated and vector images either cannot be redrawn safely or are already
// small, so leave them alone.
const SKIP_TYPES = new Set(["image/gif", "image/svg+xml"])

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => resolve({ image, url })
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not decode image"))
    }

    image.src = url
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      resolve(null)
      return
    }

    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

// A PNG is only kept as PNG when it really uses transparency; otherwise JPEG is
// far smaller for photos and screenshots alike.
function hasTransparency(context, width, height) {
  try {
    const { data } = context.getImageData(0, 0, width, height)

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true
    }

    return false
  } catch {
    // Cannot inspect the pixels, so assume transparency and stay lossless.
    return true
  }
}

function outputName(name, type) {
  const base = String(name || "image").replace(/\.[^.]+$/, "") || "image"
  return `${base}.${type === "image/png" ? "png" : "jpg"}`
}

export async function compressImage(file, options = {}) {
  const maxEdge = options.maxEdge || MAX_EDGE
  const quality = options.quality || JPEG_QUALITY

  if (!file || typeof file.size !== "number" || !file.type?.startsWith("image/")) {
    return file
  }

  if (SKIP_TYPES.has(file.type) || file.size <= SKIP_BELOW_BYTES) {
    return file
  }

  let loaded
  try {
    loaded = await loadImage(file)
  } catch {
    return file
  }

  const { image, url } = loaded

  try {
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height

    if (!width || !height) return file

    // Only ever shrink: a small image is never blown up to the cap.
    const scale = Math.min(1, maxEdge / Math.max(width, height))
    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext("2d")
    if (!context) return file

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"
    context.drawImage(image, 0, 0, targetWidth, targetHeight)

    const keepPng = file.type === "image/png" && hasTransparency(context, targetWidth, targetHeight)
    const outputType = keepPng ? "image/png" : "image/jpeg"
    const blob = await canvasToBlob(canvas, outputType, outputType === "image/jpeg" ? quality : undefined)

    // Some images are already optimal, and re-encoding can make them larger.
    if (!blob || blob.size >= file.size) return file

    return new File([blob], outputName(file.name, outputType), {
      type: outputType,
      lastModified: file.lastModified || Date.now(),
    })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}
