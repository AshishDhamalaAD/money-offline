export const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
}

export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
}

export const getNepalDate = () => {
    return new Date()
}

// Format date for database storage: 'YYYY-MM-DD HH:mm:ss'
export const formatDateTimeForDB = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')

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
