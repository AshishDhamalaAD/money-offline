import { ref } from "vue"

// Formatting preferences live in a tiny module of their own so plain helpers
// such as formatCurrency() and formatDate() can read them without pulling a
// Pinia store into every call site. The refs are reactive, so a component that
// formats inside a computed or template re-renders when the setting changes.

export const DEFAULT_LOCALE = "en-IN"
export const DEFAULT_CALENDAR = "ad"

export const LOCALE_OPTIONS = [
  { id: "en-IN", label: "English (India)" },
  { id: "en-US", label: "English (US)" },
  { id: "ne-NP", label: "नेपाली (नेपाल)" },
]

export const appLocale = ref(DEFAULT_LOCALE)
// "ad" is the Gregorian calendar used for entry, filters and storage. "bs"
// only changes how dates are displayed.
export const calendarSystem = ref(DEFAULT_CALENDAR)

export function normalizeLocale(value) {
  return LOCALE_OPTIONS.some((option) => option.id === value) ? value : DEFAULT_LOCALE
}

export function normalizeCalendarSystem(value) {
  return value === "bs" ? "bs" : DEFAULT_CALENDAR
}

export function applyLocale(value) {
  appLocale.value = normalizeLocale(value)
}

export function applyCalendarSystem(value) {
  calendarSystem.value = normalizeCalendarSystem(value)
}

export function isNepaliLocale() {
  return appLocale.value.startsWith("ne")
}
