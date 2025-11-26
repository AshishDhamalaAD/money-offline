import { db } from "../db";

export const resizedImageUrls = ({ width = 30, height = "", imageUrls = [] }) => {
    return imageUrls.map(url => {
        const [folder, fileNameWithExtension] = url.split("/");
        const [fileName, extension] = fileNameWithExtension.split(".");

        const path = [folder, "manipulations", `${fileName}-resize-${width}x${height}.${extension}`]
        return path.join("/")
    })
}

export const attachImagesTo = async (items, itemsImages) => {
    const endpoint = await db.settings.get("apiEndpoint")

    return items.map(item => {
        let itemImages = itemsImages[item.id] || [];

        item.image_urls = itemImages.map(url => `${endpoint.value}/storage/${url}`)

        item.resizedImageUrls = (width = 30, height = "") => resizedImageUrls({ width, height, imageUrls: itemImages }).map(url => `${endpoint.value}/storage/${url}`);

        return item;
    })
}
