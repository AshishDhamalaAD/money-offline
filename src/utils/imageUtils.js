import { useSettingsStore } from "../stores/settingsStore";

export const resizedImageUrls = ({ width = 30, height = "", imageUrls = [] }) => {
    const settingsStore = useSettingsStore()

    return imageUrls.map(url => {
        const [folder, fileNameWithExtension] = url.split("/");
        const [fileName, extension] = fileNameWithExtension.split(".");

        const path = [folder, "manipulations", `${fileName}-resize-${width}x${height}.${extension}`]
        return path.join("/")
    }).map(url => `${settingsStore.apiEndpoint}/storage/${url}`)
}
