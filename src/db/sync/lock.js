// Serialize trash mutations with network sync, including across open tabs.
let tail = Promise.resolve()
export function withSyncLock(work) {
  if (globalThis.navigator?.locks) {
    return navigator.locks.request('money-data-sync', work)
  }
  const result = tail.then(work, work)
  tail = result.catch(() => {})
  return result
}
