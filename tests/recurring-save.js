import { reactive } from 'vue'
import { createPinia, disposePinia } from 'pinia'
import { db } from '/src/db/dexie.js'
import { useRecurringStore } from '/src/store/recurringStore.js'

function check(value, message) { if (!value) throw new Error(message) }

export async function runRecurringSaveTests() {
  const pinia = createPinia()
  const store = useRecurringStore(pinia)
  const bookId = await db.books.add({ name: 'Recurring save fixture' })
  try {
    const rule = reactive({
      type: 'out', amount: 20, description: 'Monthly supplies',
      category_ids: [1], products: [{ name: 'Supplies', quantity: 2, rate: 10, amount: 20 }],
      frequency: 'monthly', start_date: '2026-11-01', next_due_date: '2026-12-01',
    })
    // The form spreads its reactive state into a payload; nested arrays remain proxies.
    const id = await store.addRule({ ...rule }, bookId)
    let saved = await db.recurring_transactions.get(id)
    check(saved.book_id === bookId && saved.amount === 20 && saved.active === 1, 'Recurring create did not persist its fields')
    check(saved.products[0].name === 'Supplies' && saved.category_ids[0] === 1, 'Recurring create lost nested data')
    check(saved.created_at && saved.updated_at && saved.sync_status === 'pending', 'Recurring create lost sync metadata')
    rule.products[0].quantity = 3
    check((await db.recurring_transactions.get(id)).products[0].quantity === 2, 'Saved rule retained a reference to the form')

    await db.recurring_transactions.update(id, { sync_status: 'synced' })
    await store.updateRule(id, { ...rule, amount: 30 })
    saved = await db.recurring_transactions.get(id)
    check(saved.amount === 30 && saved.products[0].quantity === 3, 'Recurring update did not persist nested reactive data')
    check(saved.sync_status === 'pending' && saved.created_at, 'Recurring update lost sync metadata')
    await store.toggleRule(reactive(saved))
    check((await db.recurring_transactions.get(id)).active === 0, 'Recurring toggle failed')
    await store.completeDue(id, '2026-12-01')
    saved = await db.recurring_transactions.get(id)
    check(saved.next_due_date === '2027-01-01' && saved.last_run_at, 'Completing a recurring transaction failed')
    const inactiveId = await store.addRule({ ...rule, active: 0 }, bookId)
    check((await db.recurring_transactions.get(inactiveId)).active === 0, 'Explicitly inactive rule became active')
  } finally {
    disposePinia(pinia)
    await db.recurring_transactions.where('book_id').equals(bookId).delete()
    await db.books.delete(bookId)
  }
  return ['recurring create and update persist reactive products; toggle and due completion work']
}
