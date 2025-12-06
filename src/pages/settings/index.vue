<script setup>
import { ref, watch } from "vue"
import { useRouter, useRoute } from "vue-router"

import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import DatabaseBackup from "@/pages/settings/DatabaseBackup.vue"
import ServerSync from "@/pages/settings/ServerSync.vue"
import ContactsManager from "@/pages/settings/ContactsManager.vue"
import ResetDatabase from "@/pages/settings/ResetDatabase.vue"
import SecuritySettings from "@/pages/settings/SecuritySettings.vue"
import ThemeSettings from "@/pages/settings/ThemeSettings.vue"

const router = useRouter()
const route = useRoute()

const tabs = [
  { id: "contacts", label: "Manage Contacts" },
  { id: "appearance", label: "Appearance" },
  { id: "security", label: "Security" },
  { id: "data", label: "Import / Export" },
  { id: "reset", label: "Reset Database" },
]
const tabIds = tabs.map((tab) => tab.id)
const activeTab = ref(tabIds.includes(route.query.tab) ? route.query.tab : "contacts")

// Watch for tab changes to update URL
watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } })
})

// Watch route query to update activeTab (for back/forward navigation)
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && tabIds.includes(newTab)) {
      activeTab.value = newTab
    }
  }
)
</script>

<template>
  <PageLayout>
    <PageHeader title="Settings" :backRoute="{ name: 'dashboard' }" />

    <main class="p-4 space-y-6">
      <!-- Tabs -->
      <div class="flex overflow-x-auto pb-2 pt-1 px-1 gap-2 no-scrollbar -mx-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
            activeTab === tab.id
              ? 'bg-indigo-600 text-white shadow-md dark:bg-indigo-500'
              : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Contacts Section -->
      <div v-if="activeTab === 'contacts'">
        <ContactsManager />
      </div>

      <!-- Appearance -->
      <div v-if="activeTab === 'appearance'">
        <ThemeSettings />
      </div>

      <!-- Database Backup & Restore -->
      <div v-if="activeTab === 'data'" class="space-y-6">
        <DatabaseBackup />

        <ServerSync />
      </div>

      <!-- Security Section -->
      <div v-if="activeTab === 'security'">
        <SecuritySettings />
      </div>

      <!-- Danger Zone -->
      <div v-if="activeTab === 'reset'">
        <ResetDatabase />
      </div>
    </main>
  </PageLayout>
</template>
