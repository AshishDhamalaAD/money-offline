<script setup>
import { ref, onMounted, onUnmounted } from "vue"

import IconSpinner from "@/assets/icons/IconSpinner.vue"

const props = defineProps({
  onRefresh: {
    type: Function,
    required: true,
  },
  threshold: {
    type: Number,
    default: 64,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const pull = ref(0)
const refreshing = ref(false)
const dragging = ref(false)

let startX = 0
let startY = 0
let active = false

function canPull() {
  if (props.disabled || refreshing.value) return false
  if (window.scrollY > 0) return false
  // Sheets, modals and the attachment viewer lock body scroll while open.
  if (document.body.style.overflow === "hidden") return false
  return true
}

function onTouchStart(event) {
  if (!canPull() || event.touches.length !== 1) return
  startX = event.touches[0].clientX
  startY = event.touches[0].clientY
  active = true
  dragging.value = false
}

function onTouchMove(event) {
  if (!active) return

  const touch = event.touches[0]
  const dy = touch.clientY - startY
  const dx = touch.clientX - startX

  if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
    pull.value = 0
    return
  }

  if (window.scrollY > 0) {
    active = false
    pull.value = 0
    return
  }

  // The gesture is a deliberate downward pull at the top of the page.
  event.preventDefault()
  dragging.value = true
  pull.value = Math.min(96, dy * 0.5)
}

async function onTouchEnd() {
  if (!active) return
  active = false
  dragging.value = false

  if (pull.value < props.threshold) {
    pull.value = 0
    return
  }

  refreshing.value = true
  pull.value = props.threshold

  try {
    await props.onRefresh()
  } finally {
    setTimeout(() => {
      refreshing.value = false
      pull.value = 0
    }, 350)
  }
}

onMounted(() => {
  window.addEventListener("touchstart", onTouchStart, { passive: true })
  window.addEventListener("touchmove", onTouchMove, { passive: false })
  window.addEventListener("touchend", onTouchEnd)
  window.addEventListener("touchcancel", onTouchEnd)
})

onUnmounted(() => {
  window.removeEventListener("touchstart", onTouchStart)
  window.removeEventListener("touchmove", onTouchMove)
  window.removeEventListener("touchend", onTouchEnd)
  window.removeEventListener("touchcancel", onTouchEnd)
})
</script>

<template>
  <div>
    <div
      class="flex items-center justify-center overflow-hidden text-gray-500 dark:text-gray-400"
      :class="{ 'transition-[height] duration-200 ease-out': !dragging }"
      :style="{ height: `${refreshing ? threshold : pull}px` }"
      aria-hidden="true"
    >
      <div v-if="pull > 0 || refreshing" class="flex items-center gap-2 text-xs font-medium">
        <IconSpinner v-if="refreshing" class="h-4 w-4 animate-spin" />
        <svg
          v-else
          class="h-4 w-4 transition-transform"
          :style="{ transform: `rotate(${Math.min(pull, threshold) / threshold * 180}deg)` }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v13m0 0l-5-5m5 5l5-5" />
        </svg>
        <span>
          {{ refreshing ? "Refreshing…" : pull >= threshold ? "Release to refresh" : "Pull to refresh" }}
        </span>
      </div>
    </div>

    <slot />
  </div>
</template>
