<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRoute } from "vue-router"

import { useInstallPrompt } from "@/composables/useInstallPrompt"
import BaseButton from "@/components/common/BaseButton.vue"

const route = useRoute()
const { canInstall, installed, isIOS, recentlyDismissed, dismiss, promptInstall } = useInstallPrompt()

// Let the first screen settle before asking the user to install.
const SHOW_DELAY_MS = 2500

const ready = ref(false)
const hidden = ref(false)
let timer = null

// Settings already exposes the install card, so don't float a second prompt there.
const onSettingsPage = computed(() => route.name === "settings")

const visible = computed(
  () =>
    ready.value &&
    !hidden.value &&
    !installed.value &&
    !onSettingsPage.value &&
    !recentlyDismissed.value &&
    (canInstall.value || isIOS.value),
)

onMounted(() => {
  timer = window.setTimeout(() => {
    ready.value = true
  }, SHOW_DELAY_MS)
})

onUnmounted(() => {
  if (timer) window.clearTimeout(timer)
})

async function install() {
  const choice = await promptInstall()
  if (choice.outcome === "accepted" || choice.outcome === "unavailable") hidden.value = true
}

function notNow() {
  hidden.value = true
  dismiss()
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-x-0 z-40 px-4"
        :class="route.meta.tab ? 'bottom-safe-24 mb-20' : 'bottom-safe-6'"
      >
        <div
          class="mx-auto flex max-w-lg items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800"
          role="region"
          aria-label="Install Money Manager"
        >
          <img src="/android-chrome-192x192.png" alt="" class="h-11 w-11 shrink-0 rounded-lg" />

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Install Money Manager</p>

            <p v-if="isIOS" class="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              Tap the Share button in Safari, then choose <span class="font-medium">Add to Home Screen</span> for a
              full-screen app that works offline.
            </p>
            <p v-else class="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              Add it to your home screen for faster, full-screen access that keeps working offline.
            </p>

            <div class="mt-3 flex justify-end gap-2">
              <BaseButton variant="ghost" size="sm" @click="notNow">Not now</BaseButton>
              <BaseButton v-if="canInstall && !isIOS" size="sm" @click="install">Install</BaseButton>
              <BaseButton v-else size="sm" @click="notNow">Got it</BaseButton>
            </div>
          </div>

          <button
            type="button"
            class="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Dismiss install prompt"
            @click="notNow"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
