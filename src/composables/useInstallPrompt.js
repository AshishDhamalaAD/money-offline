import { computed, ref } from "vue"

// Module-level state so the global banner and the Settings page share the same
// deferred install event. Listeners are attached on first import, before Vue
// mounts, because `beforeinstallprompt` can fire early.
const deferredPrompt = ref(null)
const installed = ref(false)
const dismissedAt = ref(0)
const isIOS = ref(false)

const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000
const DISMISS_KEY = "installPromptDismissedAt"

function detectStandalone() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.navigator.standalone === true
  )
}

function detectIOS() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  const iPhoneOrIPad = /iphone|ipad|ipod/i.test(ua)
  // iPadOS reports a desktop Safari user agent, so check for touch too.
  const iPadOS = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1
  return iPhoneOrIPad || iPadOS
}

function readDismissedAt() {
  try {
    return Number(localStorage.getItem(DISMISS_KEY)) || 0
  } catch {
    return 0
  }
}

installed.value = detectStandalone()
isIOS.value = detectIOS()
dismissedAt.value = readDismissedAt()

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    deferredPrompt.value = event
  })

  window.addEventListener("appinstalled", () => {
    deferredPrompt.value = null
    installed.value = true
  })

  const standaloneQuery = window.matchMedia?.("(display-mode: standalone)")
  standaloneQuery?.addEventListener?.("change", (event) => {
    if (event.matches) installed.value = true
  })
}

export function useInstallPrompt() {
  const canInstall = computed(() => Boolean(deferredPrompt.value))

  const recentlyDismissed = computed(
    () => Date.now() - dismissedAt.value < DISMISS_COOLDOWN_MS,
  )

  function dismiss() {
    dismissedAt.value = Date.now()

    try {
      localStorage.setItem(DISMISS_KEY, String(dismissedAt.value))
    } catch {
      // Private browsing can block storage; the banner still hides for this session.
    }
  }

  function resetDismissal() {
    dismissedAt.value = 0
    try {
      localStorage.removeItem(DISMISS_KEY)
    } catch {
      // Ignore storage errors.
    }
  }

  async function promptInstall() {
    if (!deferredPrompt.value) return { outcome: "unavailable" }

    const event = deferredPrompt.value
    deferredPrompt.value = null

    try {
      await event.prompt()
      const choice = await event.userChoice
      if (choice?.outcome === "accepted") installed.value = true
      else dismiss()
      return choice || { outcome: "dismissed" }
    } catch (error) {
      console.error("Install prompt failed", error)
      return { outcome: "error" }
    }
  }

  return {
    canInstall,
    installed,
    isIOS,
    recentlyDismissed,
    dismiss,
    resetDismissal,
    promptInstall,
  }
}
