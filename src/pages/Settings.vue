<script setup>
import { useRouter, useRoute } from "vue-router"
import { ref, watch } from "vue"
import PageLayout from "@/components/layout/PageLayout.vue"
import PageHeader from "@/components/layout/PageHeader.vue"
import DatabaseBackup from "@/components/module/DatabaseBackup.vue"
import ServerSync from "@/components/module/ServerSync.vue"
import ContactsManager from "@/components/module/settings/ContactsManager.vue"
import ResetDatabase from "@/components/module/settings/ResetDatabase.vue"

const router = useRouter()
const route = useRoute()

const activeTab = ref(route.query.tab || "contacts")

const tabs = [
  { id: "contacts", label: "Manage Contacts" },
  { id: "data", label: "Import / Export" },
  { id: "reset", label: "Reset Database" },
]

// Watch for tab changes to update URL
watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } })
})

// Watch route query to update activeTab (for back/forward navigation)
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && ["contacts", "data", "reset"].includes(newTab)) {
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
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Contacts Section -->
      <div v-if="activeTab === 'contacts'">
        <ContactsManager />
      </div>

      <!-- Database Backup & Restore -->
      <div v-if="activeTab === 'data'" class="space-y-6">
        <DatabaseBackup />

        <ServerSync />
      </div>

      <!-- Danger Zone -->
      <div v-if="activeTab === 'reset'">
        <ResetDatabase />
      </div>
    </main>
  </PageLayout>
</template>
