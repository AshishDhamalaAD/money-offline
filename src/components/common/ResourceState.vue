<script setup>
import { computed } from 'vue'
import BaseError from '@/components/common/BaseError.vue'

const props = defineProps({ resources: { type: Array, default: () => [] } })
const pending = computed(() => props.resources.some(resource => resource.loading && !resource.ready))
const available = computed(() => props.resources.every(resource => resource.ready))
</script>

<template>
  <div class="space-y-3">
    <template v-for="(resource, index) in resources" :key="index">
      <BaseError :message="resource.error" :busy="resource.loading" @retry="resource.retry" />
    </template>
    <p v-if="pending" role="status" class="text-sm text-gray-600 dark:text-gray-300">Loading data...</p>
    <slot v-if="available" />
  </div>
</template>
