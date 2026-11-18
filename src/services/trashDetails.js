import { db } from '@/db/dexie'

const uniqueIds = values => [...new Set(values.filter(value => value != null && value !== ''))]
async function lookup(table, ids) {
  const rows = await db[table].bulkGet(uniqueIds(ids))
  return new Map(rows.filter(Boolean).map(row => [row.id, row]))
}

// Keep display labels outside the raw row so restoring never adds UI metadata
// to transactions. Older Trash entries resolve their references on read.
export async function describeTrashEntries(entries) {
  const rows = entries.map(entry => entry.row)
  const [products, categories, contacts, paymentModes] = await Promise.all([
    lookup('products', rows.flatMap(row => (row.products || []).map(item => item.product_id))),
    lookup('categories', rows.flatMap(row => [
      ...(row.category_ids || []), ...(row.products || []).map(item => item.category_id),
    ])),
    lookup('contacts', rows.map(row => row.contact_id)),
    lookup('payment_modes', rows.map(row => row.payment_mode_id)),
  ])

  return entries.map(entry => {
    if (entry.details) return entry
    const row = entry.row
    const categoryIds = uniqueIds([
      ...(row.category_ids || []), ...(row.products || []).map(item => item.category_id),
    ])
    return {
      ...entry,
      details: {
        productNames: (row.products || []).map(item => item.name || products.get(item.product_id)?.name
          || (item.product_id ? `Product #${item.product_id} (unavailable)` : 'Unnamed item')),
        categories: categoryIds.map(id => categories.get(id)?.name || `Category #${id} (unavailable)`),
        contact: row.contact_id ? contacts.get(row.contact_id)?.name || `Contact #${row.contact_id} (unavailable)` : '',
        paymentMode: row.payment_mode_id ? paymentModes.get(row.payment_mode_id)?.name || `Payment mode #${row.payment_mode_id} (unavailable)` : '',
      },
    }
  })
}
