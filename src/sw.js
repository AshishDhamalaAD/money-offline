import { clientsClaim } from "workbox-core"
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching"
import { NavigationRoute, registerRoute } from "workbox-routing"

// The app registers the worker in "prompt" mode, so a new version waits until
// the user chooses Reload. The update prompt sends this message.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting()
})

// Tapping a reminder should bring the installed app forward instead of doing
// nothing, which is the browser default when no handler exists.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || "/"

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })

      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue
        await client.focus()
        if ("navigate" in client) await client.navigate(targetUrl)
        return
      }

      await self.clients.openWindow(targetUrl)
    })(),
  )
})

// Web Push support for a future server-side sender. Reminders created inside
// the app go through registration.showNotification instead.
self.addEventListener("push", (event) => {
  let payload = {}

  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { body: event.data?.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Money Manager", {
      body: payload.body || "You have an update.",
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
      tag: payload.tag || "money-push",
      data: { url: payload.url || "/" },
    }),
  )
})

// Background Sync: the sync engine lives in the page (it needs Dexie and the
// Pinia store), so the worker asks any open window to run it. If no window is
// open the browser retries the sync event later.
self.addEventListener("sync", (event) => {
  if (event.tag !== "money-sync") return

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })

      for (const client of windows) {
        client.postMessage({ type: "RUN_SYNC", reason: "background-sync" })
      }
    })(),
  )
})

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

// Single-page app: unknown navigations fall back to the precached shell.
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")))
