import { createApp, h, nextTick, reactive } from 'vue'
import { createPinia, disposePinia } from 'pinia'
import TransactionFields from '/src/pages/transaction-form/TransactionFields.vue'

function check(value, message) { if (!value) throw new Error(message) }

export async function runProductCalculationTests() {
  const pinia = createPinia()
  const form = reactive({
    type: 'out', amount: 175, discount: 0, charge: 0, description: '',
    category_ids: [], contact_id: '', payment_mode_id: '',
    products: [
      { id: 1, name: 'Chicken momo', quantity: 1, rate: 150, amount: 150 },
      { id: 2, name: 'Other item', quantity: 1, rate: 25, amount: 25 },
    ],
  })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render: () => h(TransactionFields, { bookId: 1, form, initialShowProducts: true }) })
  app.use(pinia)
  const errors = []
  app.config.errorHandler = error => errors.push(error)
  app.mount(host)
  function field(label, index = 0) {
    const labels = [...host.querySelectorAll('label')].filter(el => el.textContent.trim() === label)
    check(labels[index], `Missing ${label} input`)
    return document.getElementById(labels[index].htmlFor)
  }
  async function enter(label, value) {
    const input = field(label)
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
  }
  function expectLine(quantity, amount, total = amount + 25) {
    check(form.products[0].quantity === quantity, `Expected quantity ${quantity}, got ${form.products[0].quantity}`)
    check(form.products[0].amount === amount, `Expected line amount ${amount}, got ${form.products[0].amount}`)
    check(form.amount === total, `Expected total ${total}, got ${form.amount}`)
    check(Number(host.querySelector('input[readonly]').value) === total, 'Displayed total is stale')
  }
  try {
    await nextTick()
    await enter('Qty', '2'); expectLine(2, 300)
    await enter('Qty', '3'); expectLine(3, 450)
    // Typing 75 can pass through an intermediate 7; neither edit may lag.
    await enter('Amount', '7'); expectLine(0.05, 7)
    await enter('Amount', '75'); expectLine(0.5, 75)
    check(Number(field('Qty').value) === 0.5, 'Displayed quantity must use the latest amount')
    await enter('Rate', '200'); expectLine(0.5, 100)
    await enter('Qty', ''); expectLine('', 0)
    await enter('Qty', '1'); expectLine(1, 200)
    await enter('Rate', '0'); expectLine(1, 0)
    await enter('Amount', '75'); expectLine(1, 75)
    await enter('Rate', '150'); expectLine(1, 150)
    host.querySelector('[aria-label="Increase quantity"]').click()
    await nextTick(); expectLine(2, 300)
    host.querySelector('[aria-label="Decrease quantity"]').click()
    await nextTick(); expectLine(1, 150)
    await enter('Discount', '10'); expectLine(1, 150, 165)
    await enter('Charge', '5'); expectLine(1, 150, 170)
    form.type = 'in'
    await nextTick(); expectLine(1, 150, 175)
    check(!errors.length, errors[0]?.message)
  } finally {
    app.unmount()
    disposePinia(pinia)
    host.remove()
  }
  return ['product direct edits immediately recalculate quantity, rate, amount and totals; buttons and adjustments stay consistent']
}
