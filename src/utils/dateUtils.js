export const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-NP', {
        timeZone: 'Asia/Kathmandu',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
}

export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-NP', {
        timeZone: 'Asia/Kathmandu',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-NP', {
        timeZone: 'Asia/Kathmandu',
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
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }))
}
