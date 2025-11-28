<script setup>
import { twMerge } from "tailwind-merge"
</script>

<template>
  <svg :class="twMerge('h-6 w-6', $attrs.class)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
  </svg>
</template>
