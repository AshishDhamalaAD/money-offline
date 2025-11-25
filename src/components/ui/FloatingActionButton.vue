<script setup>
defineProps({
  show: {
    type: Boolean,
    default: true,
  },
})

defineEmits(["click"])
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed bottom-6 right-6 z-40">
      <button
        @click="$emit('click')"
        class="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105 active:scale-95"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  </Teleport>
</template>
