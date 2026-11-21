import { createApp, h, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import applicationRouter from '/src/router/index.js'
import { db } from '/src/db/dexie.js'
import { useSettingsStore } from '/src/store/settingsStore.js'

function check(value, message) { if (!value) throw new Error(message) }
async function waitFor(read, message) {
  for (let i = 0; i < 100; i++) {
    await nextTick()
    if (read()) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(message)
}

// Render the affected routes with real stores. Vite's build alone does not
// detect missing template bindings or runtime subscription errors.
export async function runAccessibilityRouteTests() {
  const stamp = '2026-11-20 12:00:00'
  const bookId = await db.books.add({ name: 'Route fixture', created_at: stamp })
  const categoryId = await db.categories.add({ book_id: bookId, name: 'Route category', sort: 1 })
  const paymentId = await db.payment_modes.add({ book_id: bookId, name: 'Cash' })
  const contactId = await db.contacts.add({ name: 'Route contact' })
  const productId = await db.products.add({ book_id: bookId, name: 'Route product', rate: 10, quantity_type: 'unit', created_at: stamp, category_id: categoryId, attachments: [] })
  const budgetId = await db.budgets.add({ book_id: bookId, category_id: categoryId, amount: 100 })
  const recurringId = await db.recurring_transactions.add({ book_id: bookId, active: 1, type: 'out', amount: 10, description: 'Route schedule', category_ids: [categoryId], products: [], frequency: 'monthly', start_date: '2099-01-01', next_due_date: '2099-01-01' })
  const transactionId = await db.transactions.add({ book_id: bookId, type: 'out', amount: 10, date: stamp, category_ids: [categoryId], products: [], description: 'Route transaction', payment_mode_id: paymentId, attachments: [] })
  const routes = [
    ['dashboard', {}, 'My Books'],
    ['book-details', { id: bookId }, 'Route fixture'],
    ['book-charts', { bookId }, 'Route fixture'],
    ['book-settings-products', { bookId }, 'Manage Products'],
    ['book-settings-categories', { bookId }, 'Manage Categories'],
    ['book-settings-payment-modes', { bookId }, 'Manage Payment'],
    ['book-settings-budgets', { bookId }, 'Monthly budgets'],
    ['book-settings-recurring', { bookId }, 'Recurring transactions'],
    ['book-settings-trash', { bookId }, 'Trash'],
    ['product-rates-history', { bookId, productId }, 'No history found.'],
    ['book-settings-products-edit', { bookId, id: productId }, 'Edit Product'],
    ['book-settings-categories-edit', { bookId, id: categoryId }, 'Edit Category'],
    ['book-settings-payment-modes-edit', { bookId, id: paymentId }, 'Edit Payment'],
    ['book-settings-budgets-edit', { bookId, id: budgetId }, 'Edit Budget'],
    ['book-settings-recurring-edit', { bookId, id: recurringId }, 'Edit Recurring'],
    ['edit-contact', { id: contactId }, 'Edit Contact'],
    ['edit-transaction', { bookId, id: transactionId }, 'Edit Transaction'],
    ['create-transaction', { bookId }, 'New Transaction'],
    ['settings', {}, 'Settings'],
  ]
  let app, host, pinia
  const originalDark = document.documentElement.classList.contains('dark')
  try {
    for (let index = 0; index < routes.length; index++) {
      const [name, params, expected] = routes[index]
      pinia = createPinia(); setActivePinia(pinia)
      await useSettingsStore().init()
      document.documentElement.classList.toggle('dark', index % 2 === 1)
      const router = createRouter({ history: createMemoryHistory(), routes: applicationRouter.options.routes })
      await router.push({ name, params }); await router.isReady()
      const warnings = [], errors = []
      host = document.createElement('div'); document.body.appendChild(host)
      app = createApp({ render: () => h(RouterView) })
      app.config.warnHandler = message => { if (/not defined|Invalid prop|injection .*not found/.test(message)) warnings.push(message) }
      app.config.errorHandler = error => errors.push(error)
      app.use(pinia); app.use(router); app.mount(host)
      await waitFor(() => host.textContent.includes(expected), `${name} did not render expected content (${host.textContent.slice(0, 100)})`)
      await waitFor(() => !host.textContent.includes('Loading data...'), `${name} did not finish loading`)
      check(!warnings.length, `${name}: ${warnings.join('; ')}`)
      check(!errors.length, `${name}: ${errors.map(error => error.message).join('; ')}`)
      check(!host.querySelector('[role="alert"]'), `${name} rendered a failure on valid fixture data`)
      const unnamed = [...host.querySelectorAll('button')].filter(element => !element.textContent.trim() && !element.getAttribute('aria-label') && !element.getAttribute('title') && !element.getAttribute('aria-labelledby'))
      check(!unnamed.length, `${name} has unnamed buttons: ${unnamed.map(element => element.outerHTML.slice(0, 140)).join('; ')}`)
      app.unmount(); app = null; host.remove(); host = null
      pinia._s.forEach(store => store.$dispose()); pinia = null
    }
    return ['affected routes render real data without missing bindings, runtime errors, false empty states or unnamed buttons in light/dark themes']
  } finally {
    app?.unmount(); host?.remove(); pinia?._s.forEach(store => store.$dispose())
    document.documentElement.classList.toggle('dark', originalDark)
    for (const table of ['transactions', 'categories', 'products', 'payment_modes', 'budgets', 'recurring_transactions']) await db[table].where('book_id').equals(bookId).delete()
    await db.books.delete(bookId); await db.contacts.delete(contactId)
  }
}
