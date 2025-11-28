<script setup>
import IconHistory from "@/assets/icons/IconHistory.vue"
import { useRouter } from "vue-router"

const router = useRouter()

const props = defineProps({
  productId: {
    type: Number,
    required: true,
  },
  bookId: {
    type: Number,
    required: true,
  },
})

function navigateToHistory() {
  router.push({
    name: "product-rates-history",
    params: {
      bookId: props.bookId,
      productId: props.productId,
    },
  })
}
</script>

<template>
  <button
    @click.stop="navigateToHistory()"
    class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
    title="View Rate History"
  >
    <IconHistory class="w-5 h-5" />
  </button>
</template>
