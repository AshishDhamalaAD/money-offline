import { createApp, h, nextTick, reactive, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { db } from '/src/db/dexie.js'
import { useLiveResource } from '/src/composables/useLiveResource.js'
import { useTransactionStore } from '/src/store/transactionStore.js'
import { useSettingsStore } from '/src/store/settingsStore.js'
import BaseModal from '/src/components/common/BaseModal.vue'
import BaseBottomSheet from '/src/components/common/BaseBottomSheet.vue'
import AttachmentViewer from '/src/components/common/AttachmentViewer.vue'
import LightGallery from '/src/components/common/LightGallery.vue'
import BaseConfirm from '/src/components/common/BaseConfirm.vue'
import BaseInput from '/src/components/common/BaseInput.vue'
import BaseSelect from '/src/components/common/BaseSelect.vue'
import BaseSearchableSelect from '/src/components/common/BaseSearchableSelect.vue'
import BaseToast from '/src/components/common/BaseToast.vue'
import ResourceState from '/src/components/common/ResourceState.vue'
import CategoryForm from '/src/pages/book-settings/categories/CategoryForm.vue'
import DatabaseBackup from '/src/pages/settings/DatabaseBackup.vue'
import ResetDatabase from '/src/pages/settings/ResetDatabase.vue'
import App from '/src/App.vue'

function check(value, message) { if (!value) throw new Error(message) }
async function waitFor(read, message) {
  for (let i = 0; i < 150; i++) {
    await nextTick()
    if (await read()) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(`${message}; focus=${document.activeElement?.outerHTML?.slice(0, 200)}; dialogs=${[...document.querySelectorAll('[role=dialog]')].map(element => element.textContent.slice(0, 100)).join(' | ')}`)
}
function button(root, text) { return [...root.querySelectorAll('button')].find(element => element.textContent.trim() === text) }

export async function runAccessibilityTests() {
  const passed = []
  let app, host
  function mount(component, pinia, router) {
    host = document.createElement('div'); document.body.appendChild(host)
    app = createApp(component)
    if (pinia) app.use(pinia)
    if (router) app.use(router)
    app.mount(host)
    return host
  }
  async function unmount() {
    app?.unmount(); app = null
    host?.remove(); host = null
    await nextTick()
    // Allow leave transitions to remove teleported portals.
    await new Promise(resolve => setTimeout(resolve, 180))
  }
  const originalOverflow = document.body.style.overflow
  try {
    const parent = ref(false), child = ref(false), busy = ref(false)
    const outside = document.createElement('button'); outside.textContent = 'Outside'; outside.setAttribute('aria-hidden', 'false'); document.body.appendChild(outside)
    document.body.style.overflow = 'clip'
    mount({ render: () => h('div', [
      h('button', { id: 'opener', onClick: () => { parent.value = true } }, 'Open parent'),
      h(BaseModal, { show: parent.value, title: 'Parent dialog', initialFocus: '#parent-first', onClose: () => { parent.value = false } }, () => [
        h('button', { id: 'parent-first' }, 'First'),
        h('button', { id: 'open-child', onClick: () => { child.value = true } }, 'Open child'),
        h('button', { id: 'parent-last' }, 'Last'),
        h(BaseBottomSheet, { modelValue: child.value, title: 'Child dialog', initialFocus: '#child-field', dismissible: !busy.value, 'onUpdate:modelValue': value => { child.value = value } }, () => h('input', { id: 'child-field' })),
      ]),
    ]) })
    const opener = host.querySelector('#opener'); opener.focus()
    await window.moneyPressKey('Enter')
    await waitFor(() => document.activeElement.id === 'parent-first', 'dialog did not focus designated control')
    const parentRoot = document.activeElement.closest('[role="dialog"]')
    check(document.getElementById(parentRoot.getAttribute('aria-labelledby')).textContent === 'Parent dialog', 'dialog is not named by its heading')
    check(outside.inert && document.body.style.overflow === 'hidden', 'background not isolated')
    parentRoot.querySelector('#parent-last').focus()
    await window.moneyPressKey('Tab')
    check(document.activeElement.getAttribute('aria-label') === 'Close dialog', 'Tab did not wrap to first control')
    await window.moneyPressKey('Tab', true)
    check(document.activeElement.id === 'parent-last', 'Shift+Tab did not wrap to last control')
    parentRoot.querySelector('#open-child').focus(); await window.moneyPressKey('Enter')
    await waitFor(() => document.activeElement.id === 'child-field', 'child did not receive focus')
    check(parentRoot.inert, 'underlying dialog still interactive')
    const childRoot = document.activeElement.closest('[role="dialog"]')
    check(Number(childRoot.style.zIndex) > Number(parentRoot.style.zIndex), 'dialog layers do not match focus order')
    await window.moneyPressKey('Escape')
    await waitFor(() => document.activeElement.id === 'open-child', 'focus did not return to child opener')
    check(parent.value && !child.value && document.body.style.overflow === 'hidden', 'Escape closed parent or unlocked scroll')
    child.value = true; busy.value = true
    await waitFor(() => document.activeElement.id === 'child-field', 'busy dialog did not open')
    await window.moneyPressKey('Escape')
    check(child.value && parent.value, 'busy dialog was dismissed')
    child.value = false
    await nextTick()
    await window.moneyPressKey('Escape')
    await waitFor(() => document.activeElement === opener, 'parent did not restore opener focus')
    check(!outside.inert && outside.getAttribute('aria-hidden') === 'false' && document.body.style.overflow === 'clip', 'background attributes or previous scroll state not restored')
    parent.value = true
    await nextTick(); await unmount()
    check(!outside.inert && document.body.style.overflow === 'clip', 'open-dialog unmount leaked inert or scroll lock')
    outside.remove(); document.body.style.overflow = originalOverflow
    passed.push('real keyboard dialog focus, nested Escape, busy dismissal, visual order, restoration and cleanup')

    const selection = ref(null), selectOpen = ref(true)
    mount({ render: () => h(BaseModal, { show: selectOpen.value, title: 'Select fixture', onClose: () => { selectOpen.value = false } }, () => [
      h(BaseSearchableSelect, { id: 'category-choice', label: 'Category', modelValue: selection.value, 'onUpdate:modelValue': value => { selection.value = value }, options: [{ label: 'Apple', value: 1 }, { label: 'Banana', value: 2 }, { label: 'Carrot', value: 3 }] }),
      h('button', { id: 'after-select' }, 'Continue'),
    ]) })
    await nextTick()
    document.getElementById('category-choice').focus()
    await window.moneyPressKey(' ')
    await waitFor(() => document.activeElement.getAttribute('role') === 'combobox', 'Space did not open searchable select')
    await window.moneyPressKey('End')
    await window.moneyPressKey('Enter')
    await waitFor(() => selection.value === 3, 'keyboard did not select final option')
    check(document.activeElement.id === 'category-choice', 'selection did not restore trigger focus')
    await window.moneyPressKey('Enter')
    await nextTick()
    const search = document.activeElement
    search.value = 'Ban'; search.dispatchEvent(new Event('input', { bubbles: true })); await nextTick()
    check(document.querySelectorAll('[role="option"]').length === 1, 'search filtering changed')
    await window.moneyPressKey('Escape')
    await nextTick()
    check(selectOpen.value && document.activeElement.id === 'category-choice', 'dropdown Escape closed parent')
    await window.moneyPressKey('Enter'); await nextTick()
    await window.moneyPressKey('Tab'); await nextTick()
    await waitFor(() => document.activeElement.id === 'after-select' && !document.querySelector('[role="listbox"]'), 'Tab did not leave dropdown normally')
    await unmount()
    passed.push('real keyboard searchable-select opening, navigation, filtering, selection, Escape and Tab')

    mount({ render: () => h('div', [
      h(BaseInput, { id: 'amount-test', label: 'Amount', error: 'Enter an amount', required: true }),
      h(BaseSelect, { id: 'type-test', label: 'Type', error: 'Choose a type', required: true }),
      h(BaseInput, { id: 'password-test', type: 'password', label: 'Password' }),
    ]) })
    for (const id of ['amount-test', 'type-test']) {
      const input = document.getElementById(id)
      check(input.required && input.getAttribute('aria-invalid') === 'true' && document.getElementById(input.getAttribute('aria-describedby')), 'field error/required semantics missing')
      check(host.querySelector(`label[for="${id}"]`), 'field label disconnected')
    }
    check(host.querySelector('[aria-label="Show password"]'), 'password action unnamed')
    await unmount()
    passed.push('shared field labels, required state, error descriptions and password action names')

    let resource, fail = true, attempts = 0
    mount({ setup() {
      resource = reactive(useLiveResource([], 'Could not load test records.'))
      resource.start(async () => { attempts++; if (fail) throw new Error('Injected read failure'); return [] }, 'one')
      return () => h(ResourceState, { resources: [resource] }, () => h('p', 'No records found'))
    } })
    await waitFor(() => host.querySelector('[role="alert"]'), 'read failure did not show error')
    check(!host.textContent.includes('No records found'), 'failed read appeared as empty success')
    fail = false; button(host, 'Retry').click()
    await waitFor(() => host.textContent.includes('No records found'), 'retry did not recreate query')
    check(attempts === 2 && !resource.error, 'retry duplicated query or retained error')
    // An old in-flight result must not replace the current resource.
    let completeOld
    resource.start(() => new Promise(resolve => { completeOld = resolve }), 'old')
    await waitFor(() => completeOld, 'old query did not start')
    resource.start(async () => ['Current'], 'new')
    await waitFor(() => resource.data[0] === 'Current', 'new query did not finish')
    completeOld(['Obsolete']); await new Promise(resolve => setTimeout(resolve, 40))
    check(resource.data[0] === 'Current', 'obsolete query overwrote current resource')
    await unmount()
    passed.push('failed reads suppress empty states, retry recreates subscription, obsolete results ignored')

    const pinia = createPinia(); setActivePinia(pinia)
    const bookId = await db.books.add({ name: 'Accessibility fixture', created_at: '2026-11-20 12:00:00' })
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/category/:bookId/new', name: 'book-settings-categories-new', component: CategoryForm },
      { path: '/book/:bookId/categories', name: 'book-settings-categories', component: { render: () => h('p', 'Categories') } },
      { path: '/', name: 'dashboard', component: { render: () => h('p', { id: 'protected-content' }, 'Private records') } },
    ] })
    await router.push(`/category/${bookId}/new`); await router.isReady()
    const originalAdd = db.categories.add
    db.categories.add = async () => { throw new Error('Injected write failure') }
    try {
      mount(CategoryForm, pinia, router)
      await waitFor(() => button(host, 'Save') && !button(host, 'Save').disabled, 'category form did not initialize')
      const input = host.querySelector('input'); input.value = 'Keep this name'; input.dispatchEvent(new Event('input', { bubbles: true })); await nextTick()
      button(host, 'Save').click()
      await waitFor(() => host.textContent.includes('Could not save category.'), 'save error not visible')
      check(input.value === 'Keep this name' && router.currentRoute.value.name === 'book-settings-categories-new', 'failed save lost input or navigated')
    } finally { db.categories.add = originalAdd; await unmount() }
    passed.push('failed form save retains input, exposes recovery guidance and prevents success navigation')

    // Startup must not expose routes when settings cannot be loaded.
    const settings = useSettingsStore(pinia)
    settings.initialized = false
    const originalGet = db.settings.get
    db.settings.get = async () => { throw new Error('Injected settings read failure') }
    await router.push('/')
    try {
      mount(App, pinia, router)
      await waitFor(() => host.textContent.includes('Unable to open Money'), 'startup read failure not visible')
      check(!host.querySelector('#protected-content'), 'startup failure exposed routed records')
      db.settings.get = originalGet
      button(host, 'Retry').click()
      await waitFor(() => host.querySelector('#protected-content'), 'startup retry did not recover')
    } finally { db.settings.get = originalGet; await unmount() }
    passed.push('settings initialization failure gates routes and explicit retry recovers')

    const galleryParent = ref(true), viewerOpen = ref(false)
    try {
      mount({ render: () => h(BaseModal, { show: galleryParent.value, title: 'Receipt dialog', onClose: () => { galleryParent.value = false } }, () => [
        h(LightGallery, { images: ['receipt-a.jpg', 'receipt-b.jpg'] }),
        h('button', { id: 'open-viewer', onClick: () => { viewerOpen.value = true } }, 'View attachments'),
        h(AttachmentViewer, { modelValue: viewerOpen.value, images: ['receipt-a.jpg', 'receipt-b.jpg'], 'onUpdate:modelValue': value => { viewerOpen.value = value } }),
      ]) }, pinia)
      await nextTick()
      const receipt = document.querySelector('.gallery-item')
      receipt.focus(); await window.moneyPressKey('Enter')
      await waitFor(() => document.activeElement.closest('.lg-container') && !document.activeElement.closest('[inert]'), 'gallery did not take focus above parent dialog')
      await window.moneyPressKey('Escape')
      await waitFor(() => document.activeElement === receipt && !document.querySelector('.lg-show'), 'gallery did not restore receipt trigger')
      check(galleryParent.value && document.body.style.overflow === 'hidden', 'gallery Escape dismissed parent or unlocked scrolling')
      document.getElementById('open-viewer').focus(); await window.moneyPressKey('Enter')
      await waitFor(() => document.activeElement.closest('[aria-label="Attachment viewer"]'), 'attachment viewer did not receive focus')
      await window.moneyPressKey('ArrowRight')
      await waitFor(() => document.querySelector('[aria-label="Attachment viewer"] img')?.alt === 'Attachment 2', 'attachment viewer arrow navigation failed')
      await window.moneyPressKey('Escape')
      await waitFor(() => document.activeElement.id === 'open-viewer', 'attachment viewer did not restore its trigger')
      check(galleryParent.value && !viewerOpen.value, 'attachment viewer Escape closed parent')
    } finally { await unmount() }
    passed.push('gallery and attachment viewer coordinate nested focus, keyboard navigation, Escape and scroll locking')

    const confirmOpen = ref(true)
    mount({ render: () => h('div', [h('h1', 'Recovery heading'), h(BaseConfirm, { modelValue: confirmOpen.value, title: 'Delete fixture?', message: 'This removes the fixture.', 'onUpdate:modelValue': value => { confirmOpen.value = value } })]) })
    await nextTick()
    check(document.activeElement.hasAttribute('data-dialog-cancel'), 'destructive confirmation did not focus Cancel')
    const confirmDialog = document.activeElement.closest('[role="dialog"]')
    check(document.getElementById(confirmDialog.getAttribute('aria-describedby'))?.textContent.includes('This removes the fixture.'), 'confirmation description not associated')
    await window.moneyPressKey('Escape')
    await nextTick()
    await waitFor(() => document.activeElement.tagName === 'H1', 'missing opener did not restore focus to heading')
    await unmount()
    passed.push('destructive confirmations focus Cancel, associate descriptions and fall back to a heading without an opener')


    // Exercise the real paged store, including a failed load-more retry.
    const transactionStore = useTransactionStore(pinia)
    const fixtureRows = Array.from({ length: 51 }, (_, index) => ({ book_id: bookId, type: 'out', amount: 1, date: '2026-11-20 12:00:00', description: `Keyboard fixture ${index}`, products: [] }))
    await db.transactions.bulkAdd(fixtureRows)
    const originalWhere = db.transactions.where
    try {
      db.transactions.where = () => { throw new Error('Injected transaction read failure') }
      transactionStore.openTransactionList({ bookId, search: 'Keyboard fixture' })
      await waitFor(() => transactionStore.listError, 'transaction read failure was only logged')
      check(!transactionStore.listReady && !transactionStore.listLoading, 'failed list appeared ready')
      db.transactions.where = originalWhere
      transactionStore.retryTransactionList()
      await waitFor(() => transactionStore.listReady && !transactionStore.listLoading, 'transaction read retry failed')
      check(transactionStore.listTransactions.length === 50 && transactionStore.listHasMore, 'retry lost filters or page size')
      db.transactions.where = () => { throw new Error('Injected load-more failure') }
      transactionStore.loadMoreTransactions()
      await waitFor(() => transactionStore.listError, 'load-more failure was only logged')
      check(transactionStore.listTransactions.length === 50 && transactionStore.listError.includes('outdated'), 'failed refresh did not preserve and label existing rows')
      db.transactions.where = originalWhere
      transactionStore.retryTransactionList()
      await waitFor(() => transactionStore.listTransactions.length === 51 && !transactionStore.listLoading, 'retry lost expanded page window')
      check(!transactionStore.listHasMore && !transactionStore.listError, 'successful retry did not clear error')
    } finally {
      db.transactions.where = originalWhere
      transactionStore.closeTransactionList()
      await db.transactions.where('book_id').equals(bookId).delete()
    }
    passed.push('paged transaction failures expose errors and retry preserves filters, loaded rows and pagination')


    const nativeAlert = window.alert, nativeConfirm = window.confirm
    window.alert = window.confirm = () => { throw new Error('Unexpected blocking browser dialog') }
    const originalClear = db.books.clear, originalBulkAdd = db.books.bulkAdd, originalDelete = db.delete
    try {
      mount(DatabaseBackup, pinia)
      button(host, 'Import').click(); await nextTick()
      const fileInput = document.getElementById('backup-file')
      const chooseFile = async contents => {
        const transfer = new DataTransfer(); transfer.items.add(new File([contents], 'backup.json', { type: 'application/json' }))
        fileInput.files = transfer.files; fileInput.dispatchEvent(new Event('change', { bubbles: true })); await nextTick()
      }
      await chooseFile('{broken')
      button(document.querySelector('[role="dialog"]'), 'Start Import').click()
      await waitFor(() => document.body.textContent.includes('No replacement was started.'), 'invalid file did not explain recovery')
      let replace
      db.books.clear = () => new Promise(resolve => { replace = resolve })
      db.books.bulkAdd = async () => { throw new Error('Injected replacement failure') }
      await chooseFile(JSON.stringify({ version: 1, data: { books: [{ name: 'Restored' }] } }))
      button(document.querySelector('[role="dialog"]'), 'Start Import').click()
      await waitFor(() => replace, 'replacement did not start')
      await window.moneyPressKey('Escape')
      check(document.querySelector('[role="dialog"]') && fileInput.disabled, 'busy import dismissed or allowed file change')
      replace()
      await waitFor(() => document.body.textContent.includes('Some tables may already have changed.'), 'partial replacement error promised rollback')
      check(button(document.querySelector('[role="dialog"]'), 'Choose another backup'), 'partial failure has no recovery action')
      db.books.clear = async () => {}; db.books.bulkAdd = async () => {}
      button(document.querySelector('[role="dialog"]'), 'Start Import').click()
      await waitFor(() => document.getElementById('reload-after-import'), 'import did not expose explicit Reload app action')
      check(document.activeElement.id === 'reload-after-import', 'import completion did not focus recovery action')
      await unmount()
      db.delete = async () => { throw new Error('Injected reset failure') }
      mount(ResetDatabase, pinia)
      button(host, 'Reset Database').click(); await nextTick()
      button(document.querySelector('[role="dialog"]'), 'Yes, Reset Everything').click()
      await waitFor(() => document.body.textContent.includes('Could not reset the database.'), 'reset failure not visible')
      check(button(document.querySelector('[role="dialog"]'), 'Retry') && button(document.querySelector('[role="dialog"]'), 'Cancel'), 'reset has no recovery actions')
    } finally {
      db.books.clear = originalClear; db.books.bulkAdd = originalBulkAdd; db.delete = originalDelete
      window.alert = nativeAlert; window.confirm = nativeConfirm
      await unmount()
    }
    passed.push('invalid/partial import feedback, busy dismissal, explicit success reload and reset retry without native alerts')

    const show = ref(true), message = ref('First'), duration = ref(30)
    let dismissed = 0
    mount({ render: () => h(BaseToast, { show: show.value, message: message.value, type: 'info', duration: duration.value, onClose: () => { dismissed++ } }) })
    show.value = false; await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    check(dismissed === 0, 'hidden toast timer still fired')
    show.value = true; duration.value = 150; await nextTick(); await unmount()
    check(dismissed === 0, 'unmounted toast timer still fired')
    passed.push('notification timers clear when hidden or unmounted')

    pinia._s.forEach(store => store.$dispose())
    await db.books.delete(bookId)
    return passed
  } finally {
    await unmount()
    document.body.style.overflow = originalOverflow
  }
}
