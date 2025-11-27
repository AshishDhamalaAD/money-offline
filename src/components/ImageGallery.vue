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
const loadedImages = ref(new Set())
const isDragging = ref(false)
const swipeOffset = ref(0)

const fullImageUrls = computed(() => {
  return props.images.map((url) => `${settingsStore.apiEndpoint}/storage/${url}`)
})

// Calculate the total translateX based on current index and swipe offset
const containerTranslateX = computed(() => {
  const baseOffset = -currentIndex.value * 100 // Each image is 100vw
  const swipePercentage = (swipeOffset.value / window.innerWidth) * 100
  return `${baseOffset + swipePercentage}vw`
})

function openModal(index) {
  currentIndex.value = index
  showModal.value = true
  swipeOffset.value = 0
  loadedImages.value.clear()
  document.body.style.overflow = "hidden"
}

function onImageLoad(index) {
  loadedImages.value.add(index)
}

function closeModal() {
  showModal.value = false
  document.body.style.overflow = ""
  swipeOffset.value = 0
}

function nextImage() {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0
  }
  swipeOffset.value = 0
}

function prevImage() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = props.images.length - 1
  }
  swipeOffset.value = 0
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
  swipeOffset.value = currentX - touchStartX.value
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
    swipeOffset.value = 0
  }
}

onUnmounted(() => {
  document.body.style.overflow = ""
})
</script>

<template>
  <div v-if="images.length > 0" class="flex items-center gap-2 overflow-x-auto px-2">
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

      <!-- Carousel Container -->
      <div
        class="relative w-full h-full overflow-hidden"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @click.stop
      >
        <!-- Images Carousel -->
        <div
          class="flex h-full"
          :style="{
            transform: `translateX(${containerTranslateX})`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }"
        >
          <div
            v-for="(imageUrl, index) in fullImageUrls"
            :key="index"
            class="shrink-0 w-screen h-full flex items-center justify-center p-4"
          >
            <!-- Loading placeholder with blur -->
            <div
              v-if="!loadedImages.has(index)"
              class="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-gray-800 bg-opacity-30"
            >
              <IconSpinner class="w-10 h-10 text-white animate-spin" />
            </div>

            <!-- Actual image -->
            <img
              :src="imageUrl"
              class="max-w-full max-h-full object-contain select-none"
              :class="{ 'opacity-0': !loadedImages.has(index) }"
              draggable="false"
              @load="onImageLoad(index)"
              lazy
            />
          </div>
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
