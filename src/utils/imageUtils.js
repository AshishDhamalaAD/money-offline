import { useSettingsStore } from "@/store/settingsStore"
import { isLocalAttachment, localAttachmentUrl } from "@/utils/attachmentUrl"

// A photo queued offline has no server path yet. Its blob URL (or the URL it
// resolved to after uploading) is already a complete src, so it skips the
// storage prefix and the resize convention.
export const attachmentUrl = (url) => {
    if (isLocalAttachment(url)) return localAttachmentUrl(url)

    const settingsStore = useSettingsStore()
    return `${settingsStore.apiEndpoint}/storage/${url}`
}

export const resizedImageUrls = ({ width = 30, height = "", imageUrls = [] }) => {
    const settingsStore = useSettingsStore()

    return imageUrls
        .map(url => {
            if (isLocalAttachment(url)) return localAttachmentUrl(url)

            if (typeof url !== 'string') return ''
            const split = url.lastIndexOf('/')
            const folder = url.slice(0, split)
            const fileNameWithExtension = url.slice(split + 1)
            if (split < 0 || !fileNameWithExtension.includes('.')) return attachmentUrl(url)
            const [fileName, extension] = fileNameWithExtension.split(".")

            const path = [folder, "manipulations", `${fileName}-resize-${width}x${height}.${extension}`]
            return `${settingsStore.apiEndpoint}/storage/${path.join("/")}`
        })
        .filter(Boolean)
}
