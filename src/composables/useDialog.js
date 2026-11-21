import { nextTick, onScopeDispose, watch } from 'vue'

const dialogs = []
const background = new Map()
let previousOverflow = ''
let observer
let sequence = 0
const selector = 'button, [href], input, select, textarea, [tabindex], [contenteditable="true"]'

function top() { return dialogs.at(-1) }

function focusable(root) {
  return [...root.querySelectorAll(selector)].filter(element =>
    element.tabIndex >= 0 && !element.disabled && !element.closest('[inert]') && element.getClientRects().length,
  )
}

function focusDialog(dialog) {
  const preferred = dialog.initialFocus && dialog.root.querySelector(dialog.initialFocus)
  const target = preferred && !preferred.disabled && preferred.getClientRects().length ? preferred : focusable(dialog.root)[0] || dialog.root
  target.focus({ preventScroll: true })
}

function restoreBackground() {
  for (const [element, original] of background) {
    element.inert = original.inert
    if (original.hidden === null) element.removeAttribute('aria-hidden')
    else element.setAttribute('aria-hidden', original.hidden)
  }
  background.clear()
}

function updateBackground() {
  restoreBackground()
  const current = top()
  if (!current) return
  function visit(parent) {
    for (const element of parent.children) {
      if (element === current.root || ['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName)) continue
      if (element.contains(current.root)) visit(element)
      else {
        background.set(element, { inert: element.inert, hidden: element.getAttribute('aria-hidden') })
        element.inert = true
        element.setAttribute('aria-hidden', 'true')
      }
    }
  }
  visit(document.body)
  dialogs.forEach((dialog, index) => { dialog.root.style.zIndex = String(100 + index * 10) })
}

function onKeydown(event) {
  const current = top()
  if (!current || event.defaultPrevented) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (current.dismissible()) current.close()
  } else if (event.key === 'Tab') {
    const controls = focusable(current.root)
    const first = controls[0]
    const last = controls.at(-1)
    if (!first) {
      event.preventDefault()
      current.root.focus()
    } else if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
      event.preventDefault()
      first.focus()
    }
  }
}

function onFocus(event) {
  if (top() && !top().root.contains(event.target)) focusDialog(top())
}

// Also used by third-party galleries, whose portal is created outside Vue.
export function registerDialog({ root, close, initialFocus, dismissible = () => true, priority = 0 }) {
  const opener = document.activeElement
  const originalZIndex = root.style.zIndex
  const originalTabindex = root.getAttribute('tabindex')
  const dialog = { root, close, initialFocus, dismissible, priority, order: sequence++ }
  root.tabIndex = -1
  if (!dialogs.length) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('focusin', onFocus)
    observer = new MutationObserver(() => {
      updateBackground()
      if (top() && !top().root.contains(document.activeElement)) focusDialog(top())
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
  dialogs.push(dialog)
  dialogs.sort((a, b) => a.priority - b.priority || a.order - b.order)
  updateBackground()
  if (top() === dialog) focusDialog(dialog)

  return () => {
    const wasTop = top() === dialog
    const index = dialogs.indexOf(dialog)
    if (index === -1) return
    dialogs.splice(index, 1)
    root.style.zIndex = originalZIndex
    if (originalTabindex === null) root.removeAttribute('tabindex')
    else root.setAttribute('tabindex', originalTabindex)
    updateBackground()
    if (!dialogs.length) {
      observer.disconnect()
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeydown)
      document.removeEventListener('focusin', onFocus)
    }
    if (wasTop) nextTick(() => {
      if (opener !== document.body && opener !== document.documentElement && opener?.isConnected && !opener.disabled && opener.getClientRects().length && !opener.closest('[inert]')) {
        if (!top() || top().root.contains(opener)) {
          opener.focus({ preventScroll: true })
          if (document.activeElement === opener) return
        }
      }
      if (top()) focusDialog(top())
      else {
        const heading = document.querySelector('main h1, header h1, h1, main')
        if (heading) {
          const original = heading.getAttribute('tabindex')
          heading.tabIndex = -1
          heading.focus({ preventScroll: true })
          heading.addEventListener('blur', () => {
            if (original === null) heading.removeAttribute('tabindex')
            else heading.setAttribute('tabindex', original)
          }, { once: true })
        }
      }
    })
  }
}

export function useDialog(root, open, options) {
  let release
  watch([open, root], ([isOpen, element]) => {
    release?.()
    release = null
    if (isOpen && element) release = registerDialog({ root: element, ...options })
  }, { immediate: true, flush: 'post' })
  onScopeDispose(() => release?.())
  return { isTop: () => top()?.root === root.value }
}
