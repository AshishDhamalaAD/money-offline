<script setup>
import IconPlus from "../icons/IconPlus.vue"

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
        <IconPlus />
      </button>
    </div>
  </Teleport>
</template>
