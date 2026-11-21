import { onScopeDispose, ref, shallowRef } from 'vue'
import { liveQuery } from 'dexie'

// A failed Dexie subscription terminates. Retry must create a new one.
export function useLiveResource(initialValue, message) {
  const data = ref(initialValue)
  const loading = ref(false)
  const error = ref('')
  const ready = ref(false)
  const query = shallowRef(null)
  let subscription
  let generation = 0
  let key

  function stop() {
    generation++
    subscription?.unsubscribe()
    subscription = null
    loading.value = false
  }

  function start(read, resourceKey) {
    stop()
    if (resourceKey !== key) {
      data.value = initialValue
      ready.value = false
      error.value = ''
      key = resourceKey
    }
    query.value = read
    if (!read) { error.value = ''; return }
    loading.value = true
    const current = generation
    subscription = liveQuery(read).subscribe({
      next(value) {
        if (current !== generation) return
        data.value = value
        error.value = ''
        ready.value = true
        loading.value = false
      },
      error(failure) {
        if (current !== generation) return
        console.error(message, failure)
        error.value = `${message} ${ready.value ? 'Displayed data may be outdated. ' : ''}Try again.`
        loading.value = false
      },
    })
  }
  function retry() { if (!loading.value) start(query.value, key) }
  onScopeDispose(stop)
  return { data, loading, error, ready, start, retry, stop }
}
