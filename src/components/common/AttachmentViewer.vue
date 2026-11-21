<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from "vue"

import { useDialog } from "@/composables/useDialog"

import { useSettingsStore } from "@/store/settingsStore"
import IconChevronLeft from "@/assets/icons/IconChevronLeft.vue"
import IconChevronRight from "@/assets/icons/IconChevronRight.vue"
import IconX from "@/assets/icons/IconX.vue"

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  images: {
    type: Array,
    default: () => [],
  },
  startIndex: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(["update:modelValue"])

const settingsStore = useSettingsStore()
const index = ref(0)

const urls = computed(() => props.images.map((path) => `${settingsStore.apiEndpoint}/storage/${path}`))

const currentUrl = computed(() => urls.value[index.value] || "")

watch(
  () => [props.modelValue, props.startIndex],
  ([open]) => {
    if (open) {
      index.value = Math.min(Math.max(props.startIndex, 0), Math.max(props.images.length - 1, 0))
    }
  },
  { immediate: true },
)

const dialogRef = ref(null)
const { isTop } = useDialog(dialogRef, () => props.modelValue, { close })

function close() {
  emit("update:modelValue", false)
}

function prev() {
  if (urls.value.length < 2) return
  index.value = (index.value - 1 + urls.value.length) % urls.value.length
}

function next() {
  if (urls.value.length < 2) return
  index.value = (index.value + 1) % urls.value.length
}

let startX = 0
let startY = 0

function onTouchStart(event) {
  const touch = event.touches[0]
  startX = touch.clientX
  startY = touch.clientY
}

function onTouchEnd(event) {
  const touch = event.changedTouches[0]
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
  if (dx > 0) prev()
  else next()
}

function onKeydown(event) {
  if (!props.modelValue || !isTop() || event.defaultPrevented) return
  if (event.key === "ArrowLeft") prev()
  else if (event.key === "ArrowRight") next()
}

onMounted(() => window.addEventListener("keydown", onKeydown))
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        ref="dialogRef"
        class="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white"
        role="dialog"
        aria-modal="true"
        aria-label="Attachment viewer"
      >
        <div class="flex items-center justify-between px-4 pb-3 pt-safe-4">
          <span class="text-sm font-medium">
            {{ urls.length ? index + 1 : 0 }} / {{ urls.length }}
          </span>
          <button
            type="button"
            class="rounded-full p-2 text-white/90 transition-colors hover:bg-white/10"
            aria-label="Close viewer"
            @click="close"
          >
            <IconX class="h-6 w-6" />
          </button>
        </div>

        <div
          class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2"
          @touchstart.passive="onTouchStart"
          @touchend="onTouchEnd"
        >
          <button
            v-if="urls.length > 1"
            type="button"
            class="absolute left-2 z-10 rounded-full bg-black/40 p-2 text-white/90 transition-colors hover:bg-black/60"
            aria-label="Previous attachment"
            @click.stop="prev"
          >
            <IconChevronLeft class="h-6 w-6" />
          </button>

          <img
            v-if="currentUrl"
            :src="currentUrl"
            :alt="`Attachment ${index + 1}`"
            class="max-h-full max-w-full object-contain"
          />

          <button
            v-if="urls.length > 1"
            type="button"
            class="absolute right-2 z-10 rounded-full bg-black/40 p-2 text-white/90 transition-colors hover:bg-black/60"
            aria-label="Next attachment"
            @click.stop="next"
          >
            <IconChevronRight class="h-6 w-6" />
          </button>
        </div>

        <div v-if="urls.length > 1" class="flex justify-center gap-2 pb-safe-4 pt-3">
          <button
            v-for="(url, i) in urls"
            :key="url"
            type="button"
            :class="[
              'h-2 w-2 rounded-full transition-colors',
              i === index ? 'bg-white' : 'bg-white/35',
            ]"
            :aria-label="`Show attachment ${i + 1}`"
            @click="index = i"
          ></button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
