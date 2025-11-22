<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { updateServiceWorker } = useRegisterSW()

const containerRef = ref(null)
const isPulling = ref(false)
const pullDistance = ref(0)
const isLoading = ref(false)
const threshold = 80 // px to pull down to trigger refresh

let startY = 0
let currentY = 0

function handleTouchStart(e) {
    // Only trigger if we are at the top of the page
    if (window.scrollY > 0) return

    startY = e.touches[0].clientY
    isPulling.value = true
}

function handleTouchMove(e) {
    if (!isPulling.value) return

    // If we scrolled down, stop pulling
    if (window.scrollY > 0) {
        isPulling.value = false
        pullDistance.value = 0
        return
    }

    currentY = e.touches[0].clientY
    const diff = currentY - startY

    if (diff > 0) {
        // Add resistance
        pullDistance.value = Math.min(diff * 0.5, 150)

        // Prevent default pull-to-refresh from browser if we are handling it
        if (e.cancelable && pullDistance.value > 10) {
            e.preventDefault()
        }
    } else {
        pullDistance.value = 0
    }
}

async function handleTouchEnd() {
    if (!isPulling.value) return

    isPulling.value = false

    if (pullDistance.value >= threshold) {
        isLoading.value = true
        pullDistance.value = threshold // Snap to threshold while loading

        try {
            // Check for updates and reload
            await updateServiceWorker(true)

            // Even if no SW update, we reload the page to refresh content
            window.location.reload()
        } catch (error) {
            console.error('Refresh failed:', error)
            isLoading.value = false
            pullDistance.value = 0
        }
    } else {
        pullDistance.value = 0
    }
}
</script>

<template>
    <div ref="containerRef"
         class="min-h-screen relative"
         @touchstart="handleTouchStart"
         @touchmove="handleTouchMove"
         @touchend="handleTouchEnd">
        <!-- Loading Indicator -->
        <div class="absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none z-0"
             :style="{
                height: `${threshold}px`,
                transform: `translateY(${pullDistance - threshold}px)`,
                opacity: pullDistance > 0 ? 1 : 0,
                transition: isPulling ? 'none' : 'transform 0.3s ease-out, opacity 0.3s'
            }">
            <div v-if="isLoading"
                 class="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-gray-800"></div>
            <div v-else
                 class="transform transition-transform duration-200"
                 :style="{ transform: `rotate(${pullDistance * 2}deg)` }">
                <svg class="h-6 w-6 text-gray-500"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor">
                    <path stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
            </div>
        </div>

        <!-- Content -->
        <div class="relative z-10 bg-gray-50 transition-transform duration-200 ease-out min-h-screen"
             :style="{ transform: `translateY(${pullDistance}px)` }">
            <slot />
        </div>
    </div>
</template>
