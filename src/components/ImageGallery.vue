<script setup>
import { ref, computed, onUnmounted } from "vue"
import { resizedImageUrls } from "../utils/imageUtils"
import { useSettingsStore } from "../stores/settingsStore"
import IconX from "./icons/IconX.vue"
import IconChevronRight from "./icons/IconChevronRight.vue"
import IconSpinner from "./icons/IconSpinner.vue"

const settingsStore = useSettingsStore()

const props = defineProps({
  images: {
    type: Array,
    required: true,
  },
})

const showModal = ref(false)
const currentIndex = ref(0)
const isLoading = ref(false)
const translateX = ref(0)
const isDragging = ref(false)

const fullImageUrls = computed(() => {
  return props.images.map((url) => `${settingsStore.apiEndpoint}/storage/${url}`)
})

function openModal(index) {
  currentIndex.value = index
  showModal.value = true
  isLoading.value = true
  translateX.value = 0
  document.body.style.overflow = "hidden" // Prevent background scrolling
}

function onImageLoad() {
  isLoading.value = false
}

function closeModal() {
  showModal.value = false
  document.body.style.overflow = ""
}

function nextImage() {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
    isLoading.value = true
    translateX.value = 0
  } else {
    currentIndex.value = 0 // Loop back to start
    isLoading.value = true
    translateX.value = 0
  }
}

function prevImage() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    isLoading.value = true
    translateX.value = 0
  } else {
    currentIndex.value = props.images.length - 1 // Loop to end
    isLoading.value = true
    translateX.value = 0
  }
}

// Swipe detection
const touchStartX = ref(0)

function handleTouchStart(e) {
  touchStartX.value = e.changedTouches[0].screenX
  isDragging.value = true
}

function handleTouchMove(e) {
  if (!isDragging.value) return
  const currentX = e.changedTouches[0].screenX
  translateX.value = currentX - touchStartX.value
}

function handleTouchEnd(e) {
  isDragging.value = false
  const touchEndX = e.changedTouches[0].screenX
  const diff = touchEndX - touchStartX.value

  if (Math.abs(diff) > 50) {
    if (diff < 0) {
      nextImage()
    } else {
      prevImage()
    }
  } else {
    // Reset position if swipe wasn't long enough
    translateX.value = 0
  }

  if (props.images.length === 1) {
    isLoading.value = false
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
        class="relative w-full h-full flex items-center justify-center p-4 overflow-hidden"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @click.stop
      >
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center z-10">
          <IconSpinner class="w-10 h-10 text-white animate-spin" />
        </div>

        <div
          class="relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
          :style="{
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }"
        >
          <img
            :src="fullImageUrls[currentIndex]"
            class="max-w-full max-h-full object-contain select-none"
            draggable="false"
            @load="onImageLoad"
          />
        </div>

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
