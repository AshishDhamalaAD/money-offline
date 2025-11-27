<script setup>
import { ref, computed, onUnmounted } from "vue"
import { resizedImageUrls } from "../utils/imageUtils"
import { useSettingsStore } from "../stores/settingsStore"
import IconX from "./icons/IconX.vue"
import IconChevronRight from "./icons/IconChevronRight.vue"

const settingsStore = useSettingsStore()

const props = defineProps({
  images: {
    type: Array,
    required: true,
  },
})

const showModal = ref(false)
const currentIndex = ref(0)

const fullImageUrls = computed(() => {
  return props.images.map((url) => `${settingsStore.apiEndpoint}/storage/${url}`)
})

function openModal(index) {
  currentIndex.value = index
  showModal.value = true
  document.body.style.overflow = "hidden" // Prevent background scrolling
}

function closeModal() {
  showModal.value = false
  document.body.style.overflow = ""
}

function nextImage() {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0 // Loop back to start
  }
}

function prevImage() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = props.images.length - 1 // Loop to end
  }
}

// Swipe detection
const touchStartX = ref(0)
const touchEndX = ref(0)

function handleTouchStart(e) {
  touchStartX.value = e.changedTouches[0].screenX
}

function handleTouchEnd(e) {
  touchEndX.value = e.changedTouches[0].screenX
  handleSwipe()
}

function handleSwipe() {
  if (touchEndX.value < touchStartX.value - 50) {
    nextImage() // Swipe Left -> Next
  }
  if (touchEndX.value > touchStartX.value + 50) {
    prevImage() // Swipe Right -> Prev
  }
}

onUnmounted(() => {
  document.body.style.overflow = ""
})
</script>

<template>
  <div v-if="images.length > 0" class="flex items-center justify-center gap-2">
    <img
      v-for="(url, index) in resizedImageUrls({ width: 200, imageUrls: images })"
      :key="`${index}-${url}`"
      class="object-cover rounded-lg w-40 h-40 cursor-pointer hover:opacity-90 transition-opacity"
      :src="url"
      loading="lazy"
      @click="openModal(index)"
    />
  </div>

  <!-- Lightbox Modal -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-100 bg-black bg-opacity-95 flex items-center justify-center"
      @click="closeModal"
    >
      <!-- Close Button -->
      <button class="absolute top-4 right-4 text-white p-2 z-101" @click.stop="closeModal">
        <IconX class="w-8 h-8" />
      </button>

      <!-- Image Container -->
      <div
        class="relative w-full h-full flex items-center justify-center p-4"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
        @click.stop
      >
        <img
          :src="fullImageUrls[currentIndex]"
          class="max-w-full max-h-full object-contain select-none"
          draggable="false"
        />

        <!-- Navigation Buttons (Visible on desktop/larger screens) -->
        <button
          v-if="images.length > 1"
          class="absolute left-4 text-white p-2 bg-black bg-opacity-20 rounded-full hover:bg-opacity-40 transition-all hidden md:block"
          @click.stop="prevImage"
        >
          <IconChevronRight class="w-8 h-8 rotate-180" />
        </button>

        <button
          v-if="images.length > 1"
          class="absolute right-4 text-white p-2 bg-black bg-opacity-20 rounded-full hover:bg-opacity-40 transition-all hidden md:block"
          @click.stop="nextImage"
        >
          <IconChevronRight class="w-8 h-8" />
        </button>

        <!-- Counter -->
        <div
          class="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full"
        >
          {{ currentIndex + 1 }} / {{ images.length }}
        </div>
      </div>
    </div>
  </Teleport>
</template>
