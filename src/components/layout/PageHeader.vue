<script setup>
import { useRouter } from "vue-router"

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  showBack: {
    type: Boolean,
    default: true,
  },
  backRoute: {
    type: [String, Object],
    default: null,
  },
})

const router = useRouter()

function handleBack() {
  if (props.backRoute) {
    router.push(props.backRoute)
  } else {
    router.back()
  }
}
</script>

<template>
  <header class="bg-white px-4 py-4 shadow-sm sticky top-0 z-20 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <button v-if="showBack" @click="handleBack" class="rounded-full p-1 text-gray-600 hover:bg-gray-100">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-xl font-bold text-gray-900">{{ title }}</h1>
    </div>

    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
