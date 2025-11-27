<script setup>
import { resizedImageUrls } from "../utils/imageUtils"

const props = defineProps({
  images: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <div v-if="images.length > 0" class="flex items-center justify-center gap-2">
    <img
      v-for="(url, index) in resizedImageUrls({ width: 200, imageUrls: images })"
      :key="`${index}-${url}`"
      class="object-cover rounded-lg w-40 h-40"
      :src="url"
      loading="lazy"
    />
  </div>
</template>
