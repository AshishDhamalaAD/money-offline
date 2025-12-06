<script setup>
import { useCategoryStore } from "@/store/categoryStore"
import { useContactStore } from "@/store/contactStore"
import { usePaymentModeStore } from "@/store/paymentModeStore"
import { useProductStore } from "@/store/productStore"

const props = defineProps({
  filters: {
    type: Object,
    required: true,
    // { category, paymentMode, contact, product } - IDs
  },
})

const emit = defineEmits(["clear"])

const categoryStore = useCategoryStore()
const contactStore = useContactStore()
const paymentModeStore = usePaymentModeStore()
const productStore = useProductStore()
</script>

<template>
  <div class="flex flex-wrap gap-2 mt-2">
    <template v-if="filters.category">
      <span class="bg-gray-200 text-gray-800 text-sm px-2 py-1 rounded flex items-center dark:bg-gray-800 dark:text-gray-100">
        Category: {{ categoryStore.categories.find((c) => c.id === filters.category)?.name }}
        <button
          @click="$emit('clear', 'category')"
          class="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
        >
          &times;
        </button>
      </span>
    </template>
    <template v-if="filters.paymentMode">
      <span class="bg-gray-200 text-gray-800 text-sm px-2 py-1 rounded flex items-center dark:bg-gray-800 dark:text-gray-100">
        Payment: {{ paymentModeStore.paymentModes.find((p) => p.id === filters.paymentMode)?.name }}
        <button
          @click="$emit('clear', 'payment')"
          class="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
        >
          &times;
        </button>
      </span>
    </template>
    <template v-if="filters.contact">
      <span class="bg-gray-200 text-gray-800 text-sm px-2 py-1 rounded flex items-center dark:bg-gray-800 dark:text-gray-100">
        Contact: {{ contactStore.contacts.find((c) => c.id === filters.contact)?.name }}
        <button
          @click="$emit('clear', 'contact')"
          class="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
        >
          &times;
        </button>
      </span>
    </template>
    <template v-if="filters.product">
      <span class="bg-gray-200 text-gray-800 text-sm px-2 py-1 rounded flex items-center dark:bg-gray-800 dark:text-gray-100">
        Product: {{ productStore.products.find((p) => p.id === filters.product)?.name }}
        <button
          @click="$emit('clear', 'product')"
          class="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
        >
          &times;
        </button>
      </span>
    </template>
  </div>
</template>
