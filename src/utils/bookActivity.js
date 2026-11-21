function timestamp(value) {
  if (value === undefined || value === null || value === '') return -Infinity
  // Normalize database wall-clock strings for browsers requiring ISO separators.
  const time = new Date(typeof value === 'string' ? value.replace(' ', 'T') : value).getTime()
  return Number.isFinite(time) ? time : -Infinity
}

export function sortBooksByActivity(books, transactions) {
  const latest = new Map()
  for (const transaction of transactions) {
    const updated = timestamp(transaction.updated_at)
    const activity = updated === -Infinity ? timestamp(transaction.created_at) : updated
    if (activity > (latest.get(transaction.book_id) ?? -Infinity)) {
      latest.set(transaction.book_id, activity)
    }
  }

  return [...books].sort((a, b) => {
    const aActivity = latest.get(a.id) ?? -Infinity
    const bActivity = latest.get(b.id) ?? -Infinity
    if (aActivity !== bActivity) return aActivity > bActivity ? -1 : 1
    const aCreated = timestamp(a.created_at)
    const bCreated = timestamp(b.created_at)
    if (aCreated !== bCreated) return aCreated > bCreated ? -1 : 1
    return b.id - a.id
  })
}
