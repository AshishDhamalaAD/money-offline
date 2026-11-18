<script setup>
import { computed, ref } from "vue"
import { LightGallery } from "@lightgallery/vue"
import Thumbnail from "@lightgallery/vue/plugins/thumbnail"
import Zoom from "@lightgallery/vue/plugins/zoom"

// Import styles
import "lightgallery/css/lightgallery.css"
import "lightgallery/css/lg-zoom.css"
import "lightgallery/css/lg-thumbnail.css"

import { attachmentUrl, resizedImageUrls } from "@/utils/imageUtils"

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

const galleryRef = ref(null)

const plugins = [Thumbnail, Zoom]

const fullImageUrls = computed(() => {
  return props.images.map((url) => ({
    src: attachmentUrl(url),
    thumb: resizedImageUrls({ width: 200, imageUrls: [url] })[0],
  }))
})

function openGallery(index) {
  galleryRef.value?.openGallery(index)
}
</script>

<template>
  <div v-if="images.length > 0">
    <LightGallery ref="galleryRef" :slides="fullImageUrls" :plugins="plugins" :speed="500" />
    <div>
      <div v-for="(image, index) in fullImageUrls" :key="index" class="relative inline-block mr-2 mb-2">
        <a
          :href="image.src"
          class="gallery-item block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity dark:border-gray-700"
          @click.prevent="openGallery(index)"
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
    </div>
  </div>
</template>

<style>
/* Optional: Custom styles for lightgallery if needed */
.lg-backdrop {
  background-color: rgba(0, 0, 0, 0.9);
}
</style>
