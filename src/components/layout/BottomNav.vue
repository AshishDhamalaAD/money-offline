<script setup>
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import { getLastBookId } from "@/utils/lastBook"

const route = useRoute()
const router = useRouter()

const tabs = computed(() => {
  // Touch the route so the remembered book is re-read on every navigation.
  void route.fullPath

  const bookId = getLastBookId()
  const transactionsTarget = bookId
    ? { name: "book-details", params: { id: bookId } }
    : { name: "dashboard" }
  const chartsTarget = bookId
    ? { name: "book-charts", params: { bookId } }
    : { name: "dashboard" }

  return [
    { key: "home", label: "Home", icon: "home", to: { name: "dashboard" }, matches: ["dashboard"] },
    {
      key: "transactions",
      label: "Transactions",
      icon: "list",
      to: transactionsTarget,
      matches: ["book-details"],
    },
    { key: "charts", label: "Charts", icon: "chart", to: chartsTarget, matches: ["book-charts"] },
    { key: "settings", label: "Settings", icon: "settings", to: { name: "settings" }, matches: ["settings"] },
  ]
})

function isActive(tab) {
  return tab.matches.includes(route.name)
}

function go(tab) {
  if (isActive(tab)) return
  router.push(tab.to)
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 pb-safe-2 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95"
    aria-label="Primary"
  >
    <div class="mx-auto flex max-w-lg">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        @click="go(tab)"
        :aria-current="isActive(tab) ? 'page' : undefined"
        :class="[
          'flex flex-1 flex-col items-center gap-1 pb-1 pt-2 text-xs font-medium transition-colors',
          isActive(tab)
            ? 'text-indigo-600 dark:text-indigo-300'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
        ]"
      >
        <svg
          v-if="tab.icon === 'home'"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5L12 3l9 7.5" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.5 9.5V21h13V9.5" />
        </svg>

        <svg
          v-else-if="tab.icon === 'list'"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
        </svg>

        <svg
          v-else-if="tab.icon === 'chart'"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>

        <svg
          v-else
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10.3 3.6a1.7 1.7 0 013.4 0l.2 1a7 7 0 011.6.9l1-.4a1.7 1.7 0 012.1 2.4l-.5.9a7 7 0 010 1.8l.5.9a1.7 1.7 0 01-2.1 2.4l-1-.4a7 7 0 01-1.6.9l-.2 1a1.7 1.7 0 01-3.4 0l-.2-1a7 7 0 01-1.6-.9l-1 .4a1.7 1.7 0 01-2.1-2.4l.5-.9a7 7 0 010-1.8l-.5-.9a1.7 1.7 0 012.1-2.4l1 .4a7 7 0 011.6-.9l.2-1z"
          />
          <circle cx="12" cy="12" r="2.5" />
        </svg>

        <span>{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>
