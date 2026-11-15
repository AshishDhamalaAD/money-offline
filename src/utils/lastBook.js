// Remembers which book was last opened so shortcuts (bottom nav, quick add)
// can return to it without asking the user to pick a book again.

const STORAGE_KEY = "money:lastBookId"

export function getLastBookId() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const id = Number.parseInt(raw, 10)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}

export function setLastBookId(id) {
  try {
    if (id === null || id === undefined || id === "") {
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    localStorage.setItem(STORAGE_KEY, String(id))
  } catch {
    // Storage can be unavailable (private mode); shortcuts simply fall back.
  }
}
