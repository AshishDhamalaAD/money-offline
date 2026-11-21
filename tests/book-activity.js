import { createApp, nextTick } from 'vue'
import { createPinia, disposePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Dashboard from '/src/pages/dashboard/index.vue'
import applicationRouter from '/src/router/index.js'
import { db } from '/src/db/dexie.js'
import { sortBooksByActivity } from '/src/utils/bookActivity.js'

function check(value, message) { if (!value) throw new Error(message) }
async function waitFor(read, message) {
  for (let i = 0; i < 100; i++) {
    await nextTick()
    if (read()) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(message)
}

export async function runBookActivityTests() {
  const books = [
    { id: 1, created_at: '2026-01-01 00:00:00' },
    { id: 2, created_at: '2026-02-01 00:00:00' },
    { id: 3, created_at: '2026-02-01 00:00:00' },
    { id: 4, created_at: 'invalid' },
  ]
  const ids = transactions => sortBooksByActivity(books, transactions).map(book => book.id).join(',')
  check(ids([]) === '3,2,1,4', 'Empty books must sort by creation date then ID')
  check(ids([
    { book_id: 1, updated_at: 'invalid', created_at: '2026-03-01 00:00:00' },
    { book_id: 2, created_at: '2026-03-01 00:00:00' },
    { book_id: 3, updated_at: '', created_at: 'invalid', date: '2099-01-01' },
    { book_id: 4, updated_at: null, created_at: null },
  ]) === '2,1,3,4', 'Activity fallback, invalid timestamps, or tie ordering failed')
  check(ids([
    { book_id: 1, updated_at: '2026-04-01 00:00:00', created_at: '2026-03-01 00:00:00', date: '2020-01-01' },
    { book_id: 1, updated_at: '2026-01-01 00:00:00' },
    { book_id: 2, updated_at: '2026-03-01 00:00:00', date: '2099-01-01' },
  ]) === '1,2,3,4', 'Latest save must win regardless of transaction dates and input order')
  check(books.map(book => book.id).join(',') === '1,2,3,4', 'Sorting mutated the original books')

  const pinia = createPinia()
  const router = createRouter({ history: createMemoryHistory(), routes: applicationRouter.options.routes })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(Dashboard)
  app.use(pinia); app.use(router)
  const bookIds = []
  const transactionIds = []
  const errors = []
  app.config.errorHandler = error => errors.push(error)
  try {
    for (const name of ['Activity A', 'Activity B', 'Activity empty']) {
      bookIds.push(await db.books.add({ name, created_at: '2026-01-01 00:00:00' }))
    }
    const tx = (book_id, updated_at) => ({ book_id, updated_at, created_at: updated_at, date: '2020-01-01 00:00:00', type: 'out', amount: 1 })
    transactionIds.push(await db.transactions.add(tx(bookIds[0], '2026-02-01 00:00:00')))
    transactionIds.push(await db.transactions.add(tx(bookIds[1], '2026-03-01 00:00:00')))
    await router.push('/'); await router.isReady()
    app.mount(host)
    const order = () => [...host.querySelectorAll('h3 button')].map(el => el.textContent.trim()).filter(name => name.startsWith('Activity ')).join(',')
    await waitFor(() => order() === 'Activity B,Activity A,Activity empty', 'Dashboard did not sort by transaction activity')
    // A database update also represents incoming sync; no store action is needed.
    await db.transactions.update(transactionIds[0], { updated_at: '2026-04-01 00:00:00' })
    await waitFor(() => order() === 'Activity A,Activity B,Activity empty', 'Editing a transaction did not reorder live')
    const added = tx(bookIds[1], '2026-05-01 00:00:00')
    const addedId = await db.transactions.add(added)
    transactionIds.push(addedId)
    await waitFor(() => order() === 'Activity B,Activity A,Activity empty', 'Adding a backdated transaction did not reorder live')
    await db.transactions.delete(addedId)
    await waitFor(() => order() === 'Activity A,Activity B,Activity empty', 'Deleting latest activity did not recalculate order')
    await db.transactions.put({ ...added, id: addedId })
    await waitFor(() => order() === 'Activity B,Activity A,Activity empty', 'Restoring a transaction did not recalculate order')
    check(!errors.length, errors[0]?.message)
  } finally {
    app.unmount()
    disposePinia(pinia)
    host.remove()
    await db.transactions.bulkDelete(transactionIds)
    await db.books.bulkDelete(bookIds)
  }
  return ['book activity timestamps, fallbacks, ties and immutable sorting', 'My Books live ordering after add, edit, delete and restore']
}
