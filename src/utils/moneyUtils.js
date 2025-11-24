export const formatCurrency = (amount, round = 2) => {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: round
    }).format(amount || 0)
}
