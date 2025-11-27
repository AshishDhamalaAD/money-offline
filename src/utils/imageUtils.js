import { useSettingsStore } from "../stores/settingsStore";

export const resizedImageUrls = ({ width = 30, height = "", imageUrls = [] }) => {
    return imageUrls.map(url => {
        const [folder, fileNameWithExtension] = url.split("/");
        const [fileName, extension] = fileNameWithExtension.split(".");

        const path = [folder, "manipulations", `${fileName}-resize-${width}x${height}.${extension}`]
        return path.join("/")
    })
}

export const attachImagesTo = (items, itemsImages) => {
    const settingsStore = useSettingsStore()
    const endpoint = settingsStore.apiEndpoint

    return items.map(item => {
        let itemImages = itemsImages[item.id] || [];

        item.image_urls = itemImages.map(url => `${endpoint}/storage/${url}`)

        item.resizedImageUrls = (width = 30, height = "") => resizedImageUrls({ width, height, imageUrls: itemImages }).map(url => `${endpoint}/storage/${url}`);

        return item;
    })
}
