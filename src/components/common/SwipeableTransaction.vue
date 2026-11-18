<script setup>
import { ref, watch } from "vue"

import IconEdit from "@/assets/icons/IconEdit.vue"
import IconTrash from "@/assets/icons/IconTrash.vue"

const props = defineProps({
  transaction: {
    type: Object,
    required: true,
  },
  open: {
    type: Boolean,
    default: false,
  },
  selecting: {
    type: Boolean,
    default: false,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["open", "close", "edit", "duplicate", "delete", "longpress", "toggle-select", "select"])

// Widths of the action trays revealed behind the card.
const LEFT_WIDTH = 152
const RIGHT_WIDTH = 84
const LONG_PRESS_MS = 500

const offset = ref(0)
const dragging = ref(false)
const direction = ref(null) // 'left' = edit tray, 'right' = delete tray

let startX = 0
let startY = 0
let startOffset = 0
let axis = null // 'x' | 'y' while a gesture is in progress
let longPressTimer = null
let suppressClick = false

function clearLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function resetRow(notify = false) {
  offset.value = 0
  direction.value = null
  if (notify) emit("close", props.transaction.id)
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      offset.value = 0
      dragging.value = false
      direction.value = null
    } else if (direction.value) {
      offset.value = direction.value === "right" ? -RIGHT_WIDTH : LEFT_WIDTH
    }
  },
)

watch(
  () => props.selecting,
  (selecting) => {
    if (selecting) resetRow(false)
  },
)

function onTouchStart(event) {
  if (props.selecting) return

  const touch = event.touches[0]
  startX = touch.clientX
  startY = touch.clientY
  startOffset = offset.value
  axis = null
  suppressClick = false
  clearLongPress()

  longPressTimer = setTimeout(() => {
    longPressTimer = null
    if (dragging.value) return
    // Swallow the click that may follow a long press so it does not navigate.
    suppressClick = true
    resetRow(false)
    emit("longpress", props.transaction)
  }, LONG_PRESS_MS)
}

function onTouchMove(event) {
  if (props.selecting) return

  const touch = event.touches[0]
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY

  if (!axis) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
    axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
    if (axis === "x") {
      dragging.value = true
      clearLongPress()
    } else {
      // Vertical scroll: leave the row alone.
      clearLongPress()
      return
    }
  }

  if (axis !== "x") return

  const next = Math.max(-RIGHT_WIDTH, Math.min(LEFT_WIDTH, startOffset + dx))
  offset.value = next
  suppressClick = true
}

function onTouchEnd() {
  clearLongPress()

  if (axis !== "x") {
    axis = null
    return
  }

  dragging.value = false
  axis = null

  if (offset.value > LEFT_WIDTH / 2) {
    direction.value = "left"
    offset.value = LEFT_WIDTH
    emit("open", props.transaction.id)
  } else if (offset.value < -RIGHT_WIDTH / 2) {
    direction.value = "right"
    offset.value = -RIGHT_WIDTH
    emit("open", props.transaction.id)
  } else {
    resetRow(true)
  }
}

function onContentClick() {
  if (suppressClick) {
    suppressClick = false
    return
  }

  if (props.selecting) {
    emit("toggle-select", props.transaction.id)
    return
  }

  if (offset.value !== 0) {
    resetRow(true)
    return
  }

  emit("select", props.transaction)
}

function handleAction(action) {
  resetRow(true)
  if (action === "edit") emit("edit", props.transaction)
  else if (action === "duplicate") emit("duplicate", props.transaction)
  else if (action === "delete") emit("delete", props.transaction)
}

function onContextMenu() {
  if (props.selecting) return
  resetRow(false)
  emit("longpress", props.transaction)
}
</script>

<template>
  <div
    data-swipe-row
    class="relative overflow-hidden rounded-sm bg-gray-50 dark:bg-gray-950"
    style="touch-action: pan-y"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
    @contextmenu.prevent="onContextMenu"
  >
    <!-- Swipe right: edit / duplicate -->
    <div
      class="absolute inset-y-0 left-0 flex"
      :style="{ width: `${LEFT_WIDTH}px` }"
      :aria-hidden="!open || direction !== 'left'"
    >
      <button
        type="button"
        tabindex="-1"
        class="flex w-[76px] flex-col items-center justify-center gap-1 bg-indigo-600 text-[11px] font-medium text-white active:bg-indigo-700"
        @click="handleAction('edit')"
      >
        <IconEdit class="h-5 w-5" />
        Edit
      </button>
      <button
        type="button"
        tabindex="-1"
        class="flex w-[76px] flex-col items-center justify-center gap-1 bg-sky-600 text-[11px] font-medium text-white active:bg-sky-700"
        @click="handleAction('duplicate')"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V5a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2h-2" />
          <rect x="3" y="8" width="13" height="13" rx="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Duplicate
      </button>
    </div>

    <!-- Swipe left: delete -->
    <div
      class="absolute inset-y-0 right-0 flex"
      :style="{ width: `${RIGHT_WIDTH}px` }"
      :aria-hidden="!open || direction !== 'right'"
    >
      <button
        type="button"
        tabindex="-1"
        class="flex w-full flex-col items-center justify-center gap-1 bg-red-600 text-[11px] font-medium text-white active:bg-red-700"
        @click="handleAction('delete')"
      >
        <IconTrash class="h-5 w-5" />
        Delete
      </button>
    </div>

    <!-- Card -->
    <div
      class="relative flex items-stretch gap-2 bg-gray-50 dark:bg-gray-950"
      :class="{ 'transition-transform duration-200 ease-out': !dragging }"
      :style="{ transform: `translateX(${offset}px)` }"
      @click="onContentClick"
    >
      <button
        v-if="selecting"
        type="button"
        class="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-full"
        :aria-label="selected ? 'Deselect transaction' : 'Select transaction'"
        @click.stop="emit('toggle-select', transaction.id)"
      >
        <span
          :class="[
            'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
            selected
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900',
          ]"
        >
          <svg v-if="selected" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      </button>

      <div class="min-w-0 flex-1">
        <slot />
      </div>
    </div>
  </div>
</template>
