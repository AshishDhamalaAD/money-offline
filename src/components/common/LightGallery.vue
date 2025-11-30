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
  editable: {
    type: Boolean,
    default: false,
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
        selector: '.gallery-item',
      }"
      :onInit="() => {}"
    >
      <div v-for="(image, index) in fullImageUrls" :key="index" class="relative inline-block mr-2 mb-2">
        <a
          :href="image.src"
          class="gallery-item block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
        >
          <img :src="image.thumb" class="w-24 h-24 object-cover" />
        </a>
        <button
          v-if="editable"
          @click.stop="$emit('delete', index)"
          class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 focus:outline-none z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </LightGallery>
  </div>
</template>

<style>
/* Optional: Custom styles for lightgallery if needed */
.lg-backdrop {
  background-color: rgba(0, 0, 0, 0.9);
}
</style>
