import { liveQuery } from "dexie"

import { db } from "@/db/dexie"
import { todayDateOnly } from "@/utils/recurrence"

// The home-screen badge mirrors the recurring entries the app still expects the
// user to create, i.e. every active rule whose next due date has arrived. This
// keeps the icon in sync with the in-app "recurring transactions" prompt.
function supportsBadge() {
  return typeof navigator !== "undefined" && typeof navigator.setAppBadge === "function"
}

export function useAppBadge() {
  let subscription = null
  let appliedCount = null

  async function apply(count) {
    if (!supportsBadge() || appliedCount === count) return

    appliedCount = count

    try {
      if (count > 0) {
        await navigator.setAppBadge(count)
      } else if (typeof navigator.clearAppBadge === "function") {
        await navigator.clearAppBadge()
      }
    } catch (error) {
      // Badging is best effort: desktop browsers and older iOS ignore it.
      console.warn("App badge could not be updated", error)
    }
  }

  function dueRuleQuery() {
    const today = todayDateOnly()
    return db.recurring_transactions
      .filter((rule) => Boolean(rule.active) && rule.next_due_date && rule.next_due_date <= today)
      .count()
  }

  async function refresh() {
    if (!supportsBadge()) return

    try {
      await apply(await dueRuleQuery())
    } catch (error) {
      console.error("Failed to count due recurring transactions", error)
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === "visible") refresh()
  }

  function start() {
    if (subscription || !supportsBadge()) return

    subscription = liveQuery(dueRuleQuery).subscribe({
      next: (count) => apply(count),
      error: (error) => console.error("Failed to watch recurring transactions", error),
    })

    // The date can roll over while the app stays installed in the background.
    document.addEventListener("visibilitychange", onVisibilityChange)
  }

  function stop() {
    subscription?.unsubscribe()
    subscription = null
    document.removeEventListener("visibilitychange", onVisibilityChange)
    appliedCount = null
  }

  return { start, stop, refresh }
}
