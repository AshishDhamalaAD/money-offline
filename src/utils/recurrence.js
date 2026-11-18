// Date helpers for recurring transactions. Dates are kept as date-only strings
// ("YYYY-MM-DD") so a rule keeps its calendar day regardless of time zone.

import { formatDate, getNepalDate } from "./dateUtils"

export const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "month-start", label: "Start of month" },
  { value: "month-end", label: "End of month" },
  { value: "yearly", label: "Yearly" },
]

const pad = (value) => String(value).padStart(2, "0")

export function toDateOnly(value) {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }

  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayDateOnly() {
  return toDateOnly(getNepalDate())
}

export function parseDateOnly(value) {
  const [year, month, day] = toDateOnly(value).split("-").map(Number)
  return new Date(year, month - 1, day)
}

function addMonths(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  // Clamp to the last day of the target month (31 Jan -> 28/29 Feb).
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

export function addPeriod(dateOnly, frequency) {
  const date = parseDateOnly(dateOnly)

  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1)
      return toDateOnly(date)
    case "weekly":
      date.setDate(date.getDate() + 7)
      return toDateOnly(date)
    case "month-start": {
      const next = addMonths(date, 1)
      return toDateOnly(new Date(next.getFullYear(), next.getMonth(), 1))
    }
    case "month-end": {
      const next = addMonths(date, 1)
      return toDateOnly(new Date(next.getFullYear(), next.getMonth() + 1, 0))
    }
    case "yearly":
      return toDateOnly(addMonths(date, 12))
    case "monthly":
    default:
      return toDateOnly(addMonths(date, 1))
  }
}

// First occurrence for a new rule. "Start of month" and "End of month" snap to
// the nearest boundary on or after the chosen start date.
export function firstDueDate(startDate, frequency) {
  const date = parseDateOnly(startDate)

  if (frequency === "month-start") {
    if (date.getDate() === 1) return toDateOnly(date)
    return toDateOnly(new Date(date.getFullYear(), date.getMonth() + 1, 1))
  }

  if (frequency === "month-end") {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    if (date.getDate() === lastDay) return toDateOnly(date)
    return toDateOnly(new Date(date.getFullYear(), date.getMonth(), lastDay))
  }

  return toDateOnly(date)
}

// Every period that has come due, oldest first, plus the first future date.
// The cap stops a long-dormant rule from creating an unbounded pile of entries.
export function collectDueDates(nextDueDate, frequency, today = todayDateOnly(), limit = 24) {
  const dates = []
  let cursor = toDateOnly(nextDueDate)

  while (cursor && cursor <= today && dates.length < limit) {
    dates.push(cursor)
    cursor = addPeriod(cursor, frequency)
  }

  return { dates, nextDue: cursor }
}

export function frequencyLabel(value) {
  return FREQUENCIES.find((item) => item.value === value)?.label || "Monthly"
}

export function formatDateOnly(value) {
  if (!value) return ""
  return formatDate(parseDateOnly(value), { weekday: undefined })
}
