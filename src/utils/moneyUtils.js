import { appLocale } from "./locale"

// Formatters are cached per locale and precision because the list renders
// hundreds of amounts at once. The locale is read inside the function, so a
// component that formats in a computed re-runs when the setting changes.
const formatters = new Map()

function getFormatter(round) {
    const key = `${appLocale.value}|${round}`
    let formatter = formatters.get(key)

    if (!formatter) {
        formatter = new Intl.NumberFormat(appLocale.value, {
            minimumFractionDigits: 0,
            maximumFractionDigits: round,
        })
        formatters.set(key, formatter)
    }

    return formatter
}

// Amounts deliberately carry no currency symbol: this is a money app, and the
// symbol only adds noise to every row.
export const formatCurrency = (amount, round = 2) => {
    return getFormatter(round).format(amount || 0)
}
