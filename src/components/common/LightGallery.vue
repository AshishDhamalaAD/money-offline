<script setup>
import { computed } from "vue"
import LightGallery from "lightgallery/vue"
import lgThumbnail from "lightgallery/plugins/thumbnail"
import lgZoom from "lightgallery/plugins/zoom"

// Import styles
import "lightgallery/css/lightgallery.css"
import "lightgallery/css/lg-zoom.css"
import "lightgallery/css/lg-thumbnail.css"

import { resizedImageUrls } from "@/utils/imageUtils"
import { useSettingsStore } from "@/store/modules/settingsStore"

const settingsStore = useSettingsStore()

const props = defineProps({
  images: {
    type: Array,
    required: true,
  },
})

const plugins = [lgThumbnail, lgZoom]

const fullImageUrls = computed(() => {
  return props.images.map((url) => ({
    src: `${settingsStore.apiEndpoint}/storage/${url}`,
    thumb: resizedImageUrls({ width: 200, imageUrls: [url] })[0],
  }))
})
</script>

<template>
  <div v-if="images.length > 0">
    <LightGallery
      :settings="{
        speed: 500,
        plugins: plugins,
        mobileSettings: { closable: true },
      }"
      :onInit="() => {}"
    >
      <a
        v-for="(image, index) in fullImageUrls"
        :key="index"
        :href="image.src"
        class="inline-block mr-2 mb-2 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
      >
        <img :src="image.thumb" class="w-24 h-24 object-cover" />
      </a>
    </LightGallery>
  </div>
</template>

<style>
/* Optional: Custom styles for lightgallery if needed */
.lg-backdrop {
  background-color: rgba(0, 0, 0, 0.9);
}
</style>
