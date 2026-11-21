<script setup>
import { twMerge } from "tailwind-merge"
</script>

<template>
  <svg aria-hidden="true" focusable="false" :class="twMerge('h-6 w-6', $attrs.class)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
</template>
