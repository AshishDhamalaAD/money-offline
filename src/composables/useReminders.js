import { ref } from "vue"

import { db } from "@/db/dexie"
import { useSettingsStore } from "@/store/settingsStore"
import { todayDateOnly } from "@/utils/recurrence"

const CHECK_INTERVAL_MS = 60 * 1000
const ICON = "/android-chrome-192x192.png"
const BADGE = "/favicon-32x32.png"

function notificationsSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator
  )
}

export function useReminders() {
  const settingsStore = useSettingsStore()

  const supported = ref(notificationsSupported())
  const permission = ref(supported.value ? Notification.permission : "unsupported")

  let timer = null
  let started = false

  function refreshPermission() {
    permission.value = supported.value ? Notification.permission : "unsupported"
    return permission.value
  }

  async function requestPermission() {
    if (!supported.value) return "unsupported"

    try {
      const result = await Notification.requestPermission()
      permission.value = result
      return result
    } catch (error) {
      console.error("Could not request notification permission", error)
      return "denied"
    }
  }

  async function dueCount() {
    const today = todayDateOnly()
    return db.recurring_transactions
      .filter((rule) => Boolean(rule.active) && rule.next_due_date && rule.next_due_date <= today)
      .count()
  }

  async function getRegistration() {
    if (!supported.value) return null

    const existing = await navigator.serviceWorker.getRegistration()
    if (existing) return existing

    // Don't hang forever when the worker is not registered (e.g. `npm run dev`).
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
    ])
  }

  async function show(title, body, { tag = "money-reminder" } = {}) {
    if (!supported.value || refreshPermission() !== "granted") return false

    try {
      const registration = await getRegistration()

      if (registration) {
        await registration.showNotification(title, {
          body,
          tag,
          icon: ICON,
          badge: BADGE,
          data: { url: "/" },
        })
      } else {
        // Fallback for browsers that expose notifications without a worker.
        new Notification(title, { body, icon: ICON, tag })
      }

      return true
    } catch (error) {
      console.error("Could not show notification", error)
      return false
    }
  }

  function reminderMessage(count) {
    if (count === 1) return "1 scheduled transaction is ready to review."
    return `${count} scheduled transactions are ready to review.`
  }

  // Fires at most once per day, after the chosen time, and only when something
  // is actually due. If the app was closed at the chosen time it still fires on
  // the next open that day.
  async function maybeNotify() {
    if (!supported.value) return

    await settingsStore.init()

    if (!settingsStore.remindersEnabled) return
    if (refreshPermission() !== "granted") return

    const today = todayDateOnly()
    if (settingsStore.reminderLastShown === today) return

    const [hours, minutes] = String(settingsStore.reminderTime || "09:00")
      .split(":")
      .map((part) => Number(part) || 0)

    const now = new Date()
    const dueAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0)
    if (now < dueAt) return

    const count = await dueCount()
    if (count === 0) return

    const shown = await show("Recurring transactions due", reminderMessage(count))
    if (shown) await settingsStore.markReminderShown(today)
  }

  async function sendTest() {
    if (!supported.value) return { success: false, message: "Notifications are not supported in this browser." }

    if (refreshPermission() !== "granted") {
      const result = await requestPermission()
      if (result !== "granted") {
        return { success: false, message: "Notification permission was not granted." }
      }
    }

    const count = await dueCount()
    const body = count > 0 ? reminderMessage(count) : "This is a test notification. Nothing is due right now."

    const shown = await show("Money Manager reminder", body, { tag: "money-test" })
    return shown ? { success: true } : { success: false, message: "Could not show the notification." }
  }

  function onVisibilityChange() {
    if (document.visibilityState === "visible") maybeNotify()
  }

  function start() {
    if (started || !supported.value) return

    started = true
    maybeNotify()
    timer = window.setInterval(maybeNotify, CHECK_INTERVAL_MS)
    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("focus", maybeNotify)
  }

  function stop() {
    if (timer) window.clearInterval(timer)
    timer = null
    started = false
    document.removeEventListener("visibilitychange", onVisibilityChange)
    window.removeEventListener("focus", maybeNotify)
  }

  return {
    supported,
    permission,
    requestPermission,
    refreshPermission,
    sendTest,
    start,
    stop,
    maybeNotify,
  }
}
