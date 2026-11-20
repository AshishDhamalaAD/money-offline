<script setup>
import { computed, onMounted } from 'vue'
import { useBackupHealth } from '@/composables/useBackupHealth'
import { formatStorageBytes } from '@/utils/backupHealth'
import BaseButton from '@/components/common/BaseButton.vue'

const health = useBackupHealth()
const persistenceLabel = computed(() => ({
  checking: 'Checking...',
  granted: 'Granted',
  'not-granted': 'Not granted',
  unsupported: 'Unsupported in this browser',
  error: 'Unable to check',
})[health.persistenceStatus])

onMounted(() => health.refresh())
</script>

<template>
  <section aria-labelledby="storage-health-heading" class="space-y-4">
    <h2 id="storage-health-heading" class="text-lg font-semibold text-gray-800 dark:text-gray-100">Storage Health</h2>
    <div class="space-y-4 rounded-sm border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div v-if="health.estimate" class="space-y-2">
        <p class="text-sm text-gray-900 dark:text-gray-100">
          About {{ formatStorageBytes(health.estimate.usage) }} of {{ formatStorageBytes(health.estimate.quota) }} used
          ({{ health.estimate.percent.toFixed(1) }}%).
        </p>
        <progress
          class="h-2 w-full overflow-hidden rounded-full border-0 bg-gray-200 text-indigo-600 dark:bg-gray-800 dark:text-indigo-400"
          :value="Math.min(100, health.estimate.percent)"
          max="100"
          aria-label="Estimated site storage usage"
        ></progress>
      </div>
      <p v-else class="text-sm text-gray-600 dark:text-gray-300">
        {{ health.estimateStatus === 'checking' ? 'Checking storage usage...' : health.estimateStatus === 'unsupported'
          ? 'Storage estimates are not supported in this browser.' : 'Unable to estimate storage usage. Try refreshing.' }}
      </p>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        These are estimates for this site's browser storage, including data and caches. The allowance is not your device's free space.
      </p>
      <p v-if="health.storagePressure" role="status" class="rounded-sm bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
        Estimated storage usage is at least 80% of this site's allowance. Generate a backup and review pending photo uploads in Sync below.
      </p>
      <div class="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Persistent storage: {{ persistenceLabel }}</p>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Persistent storage reduces the risk of the browser automatically removing this site's data. It does not replace backups
          or protect against clearing site data or losing your device.
        </p>
        <div class="flex flex-wrap gap-3">
          <BaseButton
            v-if="health.canRequestPersistence"
            size="sm"
            :loading="health.requestingPersistence"
            @click="health.requestPersistence"
          >Request persistent storage</BaseButton>
          <BaseButton size="sm" variant="secondary" :loading="health.refreshing" :disabled="health.requestingPersistence" @click="health.refresh">Refresh status</BaseButton>
        </div>
        <p v-if="health.persistenceMessage" role="status" class="text-sm text-gray-600 dark:text-gray-300">{{ health.persistenceMessage }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
progress {
  appearance: none;
}
progress::-webkit-progress-bar {
  background: transparent;
}
progress::-webkit-progress-value {
  background: currentColor;
}
progress::-moz-progress-bar {
  background: currentColor;
}
</style>
