<script setup>
import { computed } from "vue"
import { useProductStore } from "@/store/productStore"
import { useCategoryStore } from "@/store/categoryStore"
import BaseTable from "@/components/common/BaseTable.vue"
import { formatCurrency } from "@/utils/moneyUtils"

const props = defineProps({
  transactions: {
    type: Array,
    required: true,
  },
})

const productStore = useProductStore()
const categoryStore = useCategoryStore()

const summary = computed(() => {
  const map = new Map()

  props.transactions.forEach((t) => {
    if (t.type !== "out") return

    // Strategy:
    // 1. If transaction has products, aggregate from products (using product -> category mapping)
    // 2. If transaction has NO products, aggregate from transaction categories

    if (t.products && t.products.length > 0) {
      t.products.forEach((p) => {
        // Find product to get category
        const product = productStore.products.find((prod) => prod.id === p.product_id)
        const categoryId = product?.category_id

        // If product has no category, we might want to group under "Uncategorized" or skip
        // Let's group under "Uncategorized" if ID is missing
        const catId = categoryId || "uncategorized"

        if (!map.has(catId)) {
          let catName = "Uncategorized"
          if (categoryId) {
            const cat = categoryStore.categories.find((c) => c.id === categoryId)
            if (cat) catName = cat.name
          }

          map.set(catId, {
            name: catName,
            quantity: 0,
            amount: 0,
          })
        }

        const item = map.get(catId)
        item.quantity += parseFloat(p.quantity) || 0
        item.amount += parseFloat(p.amount) || 0
      })
    } else {
      // No products, use transaction categories
      if (t.category_ids && t.category_ids.length > 0) {
        // If multiple categories, we split the amount? Or add to all?
        // Splitting is safer to avoid inflating total amount.
        const splitAmount = (parseFloat(t.amount) || 0) / t.category_ids.length

        t.category_ids.forEach((catId) => {
          if (!map.has(catId)) {
            const cat = categoryStore.categories.find((c) => c.id === catId)
            map.set(catId, {
              name: cat ? cat.name : "Unknown Category",
              quantity: 0, // No quantity for direct transaction
              amount: 0,
            })
          }

          const item = map.get(catId)
          item.amount += splitAmount
        })
      } else {
        // No categories either
        const catId = "uncategorized"
        if (!map.has(catId)) {
          map.set(catId, {
            name: "Uncategorized",
            quantity: 0,
            amount: 0,
          })
        }
        const item = map.get(catId)
        item.amount += parseFloat(t.amount) || 0
      }
    }
  })

  return Array.from(map.values())
})

const columns = [
  { key: "name", label: "Category Name", sortable: true },
  {
    key: "quantity",
    label: "Total Quantity",
    sortable: true,
    align: "right",
    format: (val) => (val > 0 ? formatCurrency(val) : "-"),
  },
  { key: "amount", label: "Total Amount", sortable: true, align: "right", format: (val) => formatCurrency(val) },
]
</script>

<template>
  <BaseTable :columns="columns" :data="summary" :default-sort="{ key: 'amount', direction: 'desc' }">
    <template #title>Category Wise Summary (Cash Out)</template>
  </BaseTable>
</template>
