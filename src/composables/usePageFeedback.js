import { computed, onScopeDispose, ref } from 'vue'

export function usePageFeedback() {
  const operationError = ref('')
  const operationBusy = ref(false)
  const operationReady = ref(false)
  const retryRead = ref(null)
  let disposed = false
  onScopeDispose(() => { disposed = true })

  async function runOperation(action, message, read = false) {
    if (operationBusy.value) return
    operationBusy.value = true
    operationError.value = ''
    retryRead.value = read ? () => runOperation(action, message, true) : null
    try {
      const result = await action()
      if (read) operationReady.value = true
      return result
    } catch (error) {
      if (disposed) return
      console.error(message, error)
      if (/^This .+ is no longer available$/.test(error?.message)) {
        retryRead.value = null
        operationError.value = `${error.message}. Return to the previous screen to review the available records.`
        return
      }
      operationError.value = /^Cannot delete\b/.test(error?.message)
        ? `${error.message} Remove those references before trying again.`
        : `${message} ${read ? 'Try loading again.' : 'Review the current records before trying this action again. Your entered values have been kept.'}`
    } finally {
      operationBusy.value = false
    }
  }
  return {
    operationError, operationBusy, operationReady, runOperation,
    reportFailure(message) { retryRead.value = null; operationError.value = message },
    operationAction: computed(() => retryRead.value ? 'Retry loading' : ''),
    retryOperation: () => retryRead.value?.(),
  }
}
