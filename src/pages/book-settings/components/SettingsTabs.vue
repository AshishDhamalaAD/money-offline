<script setup>
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"

const props = defineProps({
  bookId: {
    type: [Number, String],
    required: true,
  },
})

const route = useRoute()
const router = useRouter()

const tabs = [
  { id: "products", label: "Products", routeName: "book-settings-products" },
  { id: "categories", label: "Categories", routeName: "book-settings-categories" },
  { id: "payment-modes", label: "Payment Modes", routeName: "book-settings-payment-modes" },
]

const activeTab = computed(() => {
  if (route.name?.includes("products")) return "products"
  if (route.name?.includes("categories")) return "categories"
  if (route.name?.includes("payment-modes")) return "payment-modes"
  return "products"
})

function navigateToTab(tab) {
  router.push({
    name: tab.routeName,
    params: { bookId: props.bookId },
  })
}
</script>

<template>
  <div class="flex overflow-x-auto pb-2 pt-1 px-1 gap-2 no-scrollbar -mx-1">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      @click="navigateToTab(tab)"
      :class="[
        'rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
        activeTab === tab.id
          ? 'bg-indigo-600 text-white shadow-md'
          : 'bg-white text-gray-600 ring-1 ring-gray-200 shadow-sm',
      ]"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
