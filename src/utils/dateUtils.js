import { adToBs, bsMonthName, bsMonthKey, bsNumber, bsWeekdayName } from "./bikramSambat"
import { appLocale, calendarSystem, isNepaliLocale } from "./locale"

const NEPAL_TIME_ZONE = "Asia/Kathmandu"

const DEFAULT_DATE_OPTIONS = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
}

// Chrome's ne-NP locale falls back to English month names, so the Nepali
// Gregorian names are supplied here instead.
const NEPALI_GREGORIAN_MONTHS = {
    long: [
        "जनवरी",
        "फेब्रुअरी",
        "मार्च",
        "अप्रिल",
        "मे",
        "जुन",
        "जुलाई",
        "अगस्ट",
        "सेप्टेम्बर",
        "अक्टोबर",
        "नोभेम्बर",
        "डिसेम्बर",
    ],
    short: ["जन", "फेब", "मार्च", "अप्र", "मे", "जुन", "जुल", "अग", "सेप", "अक्ट", "नोभ", "डिस"],
}

const toDate = (value) => (value instanceof Date ? value : new Date(value))

export const formatTime = (date) => {
    return toDate(date).toLocaleTimeString(appLocale.value, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    })
}

// Bikram Sambat has no Intl calendar, so the parts are assembled from the
// conversion table. The option names match Intl.DateTimeFormat so callers can
// keep passing { weekday: undefined } and friends.
function formatBsDate(date, options) {
    const bs = adToBs(date)
    if (!bs) return date.toLocaleDateString(appLocale.value, options)

    const nepali = isNepaliLocale()
    const parts = []

    if (options.weekday) {
        parts.push(bsWeekdayName(bs.weekday, { short: options.weekday !== "long", nepali }))
    }

    if (options.day) {
        parts.push(bsNumber(bs.day, nepali))
    }

    if (options.month) {
        parts.push(
            options.month === "numeric"
                ? bsNumber(bs.month, nepali)
                : bsMonthName(bs.month, { short: options.month !== "long", nepali }),
        )
    }

    if (options.year) {
        parts.push(bsNumber(bs.year, nepali))
    }

    return parts.join(" ")
}

// Same shape as the BS formatter, but for the Gregorian fields.
function formatNepaliAdDate(date, options) {
    const parts = []

    if (options.weekday) {
        parts.push(bsWeekdayName(date.getDay(), { short: options.weekday !== "long", nepali: true }))
    }

    if (options.day) {
        parts.push(bsNumber(date.getDate(), true))
    }

    if (options.month) {
        parts.push(
            options.month === "numeric"
                ? bsNumber(date.getMonth() + 1, true)
                : NEPALI_GREGORIAN_MONTHS[options.month === "long" ? "long" : "short"][date.getMonth()],
        )
    }

    if (options.year) {
        parts.push(bsNumber(date.getFullYear(), true))
    }

    return parts.join(" ")
}

export const formatDate = (date, options = {}) => {
    const value = toDate(date)
    const settings = { ...DEFAULT_DATE_OPTIONS, ...options }

    if (calendarSystem.value === "bs") {
        // BS month abbreviations ("Man", "Kar") are not widely read, so use the
        // full name unless the caller explicitly asked for a short month.
        if (options.month === undefined) settings.month = "long"
        return formatBsDate(value, settings)
    }

    if (isNepaliLocale()) {
        if (options.month === undefined) settings.month = "long"
        return formatNepaliAdDate(value, settings)
    }

    return value.toLocaleDateString(appLocale.value, settings)
}

export const formatDateTime = (date) => {
    const value = toDate(date)
    return `${formatDate(value)}, ${formatTime(value)}`
}

// A month label for headers and pickers. Defaults to the selected calendar;
// pass { calendar: "ad" } for period filters, which always work in AD.
export const formatMonthYear = (date, { short = false, calendar = calendarSystem.value } = {}) => {
    const value = toDate(date)

    if (calendar === "bs") {
        const bs = adToBs(value)
        if (bs) {
            const nepali = isNepaliLocale()
            return `${bsMonthName(bs.month, { short, nepali })} ${bsNumber(bs.year, nepali)}`
        }
    }

    if (isNepaliLocale()) {
        return `${NEPALI_GREGORIAN_MONTHS[short ? "short" : "long"][value.getMonth()]} ${bsNumber(value.getFullYear(), true)}`
    }

    return value.toLocaleDateString(appLocale.value, {
        month: short ? "short" : "long",
        year: "numeric",
    })
}

export const formatMonthShort = (date, { calendar = calendarSystem.value } = {}) => {
    const value = toDate(date)

    if (calendar === "bs") {
        const bs = adToBs(value)
        if (bs) return bsMonthName(bs.month, { short: true, nepali: isNepaliLocale() })
    }

    if (isNepaliLocale()) return NEPALI_GREGORIAN_MONTHS.short[value.getMonth()]

    return value.toLocaleDateString(appLocale.value, { month: "short" })
}

// Grouping key for a month. It follows the displayed calendar so BS groups do
// not split at an AD month boundary.
export const getMonthKey = (date) => {
    const value = toDate(date)

    if (calendarSystem.value === "bs") {
        const bs = adToBs(value)
        if (bs) return `bs-${bsMonthKey(bs)}`
    }

    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`
}

// The current date as Nepal wall-clock time. The returned Date uses the
// device's local fields for Nepal's year/month/day/hour, so callers can keep
// using getFullYear()/getMonth()/getDate() without time-zone maths.
export const getNepalDate = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: NEPAL_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(date)

    const part = (type) => Number(parts.find((item) => item.type === type)?.value || 0)

    return new Date(
        part("year"),
        part("month") - 1,
        part("day"),
        part("hour") % 24,
        part("minute"),
        part("second"),
    )
}

// Format date for database storage: 'YYYY-MM-DD HH:mm:ss'
export const formatDateTimeForDB = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    const seconds = String(d.getSeconds()).padStart(2, "0")

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// Round amount to 2 decimal places
export const roundAmount = (amount) => {
    return Math.round((parseFloat(amount) || 0) * 100) / 100
}

export const filterByDateRange = (items, property, startDate, endDate) => {
    let txs = items

    if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        txs = txs.filter((t) => {
            const d = new Date(t[property])
            return d >= start && d <= end
        })
    }

    return txs
}
