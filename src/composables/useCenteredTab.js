import { nextTick, onMounted, ref, watch } from "vue"

// Keeps the active pill visible in a horizontally scrolling tab strip.
// Navigating between tabs mounts a fresh strip at scrollLeft 0, which would
// otherwise leave the active tab (Budgets, Recurring) off-screen while the
// strip shows the first few labels.
export function useCenteredTab(activeTab) {
  const scroller = ref(null)
  const buttons = new Map()

  function registerButton(id) {
    return (el) => {
      if (el) buttons.set(id, el)
      else buttons.delete(id)
    }
  }

  function center() {
    const container = scroller.value
    const button = buttons.get(activeTab.value)
    if (!container || !button) return

    const containerRect = container.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()
    const delta = buttonRect.left - containerRect.left - (containerRect.width - buttonRect.width) / 2

    container.scrollTo({ left: Math.max(0, container.scrollLeft + delta), behavior: "smooth" })
  }

  onMounted(() => nextTick(center))
  watch(activeTab, () => nextTick(center))

  return { scroller, registerButton, center }
}
