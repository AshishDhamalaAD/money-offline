import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/pages/dashboard/index.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'dashboard',
            component: Dashboard
        },
        {
            path: '/book/:id',
            name: 'book-details',
            component: () => import('@/pages/book-details/index.vue')
        },
        {
            path: '/book/:bookId/settings',
            redirect: to => {
                return { name: 'book-settings-products', params: { bookId: to.params.bookId } }
            }
        },
        // Products
        {
            path: '/book/:bookId/settings/products',
            name: 'book-settings-products',
            component: () => import('@/pages/book-settings/products/ProductList.vue')
        },
        {
            path: '/book/:bookId/settings/products/new',
            name: 'book-settings-products-new',
            component: () => import('@/pages/book-settings/products/ProductForm.vue')
        },
        {
            path: '/book/:bookId/settings/products/:id/edit',
            name: 'book-settings-products-edit',
            component: () => import('@/pages/book-settings/products/ProductForm.vue')
        },
        // Categories
        {
            path: '/book/:bookId/settings/categories',
            name: 'book-settings-categories',
            component: () => import('@/pages/book-settings/categories/CategoryList.vue')
        },
        {
            path: '/book/:bookId/settings/categories/new',
            name: 'book-settings-categories-new',
            component: () => import('@/pages/book-settings/categories/CategoryForm.vue')
        },
        {
            path: '/book/:bookId/settings/categories/:id/edit',
            name: 'book-settings-categories-edit',
            component: () => import('@/pages/book-settings/categories/CategoryForm.vue')
        },
        // Payment Modes
        {
            path: '/book/:bookId/settings/payment-modes',
            name: 'book-settings-payment-modes',
            component: () => import('@/pages/book-settings/payment-modes/PaymentModeList.vue')
        },
        {
            path: '/book/:bookId/settings/payment-modes/new',
            name: 'book-settings-payment-modes-new',
            component: () => import('@/pages/book-settings/payment-modes/PaymentModeForm.vue')
        },
        {
            path: '/book/:bookId/settings/payment-modes/:id/edit',
            name: 'book-settings-payment-modes-edit',
            component: () => import('@/pages/book-settings/payment-modes/PaymentModeForm.vue')
        },
        {
            path: '/book/:bookId/products/:productId/history',
            name: 'product-rates-history',
            component: () => import('@/pages/product-rates-history/index.vue')
        },
        {
            path: '/book/:bookId/transaction/create',
            name: 'create-transaction',
            component: () => import('@/pages/transaction-form/index.vue')
        },
        {
            path: '/book/:bookId/transaction/:id/edit',
            name: 'edit-transaction',
            component: () => import('@/pages/transaction-form/index.vue')
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('@/pages/settings/index.vue')
        },
        {
            path: '/settings/contacts/new',
            name: 'new-contact',
            component: () => import('@/pages/contact-edit/index.vue')
        },
        {
            path: '/settings/contacts/:id/edit',
            name: 'edit-contact',
            component: () => import('@/pages/contact-edit/index.vue')
        },
        {
            path: '/book/:bookId/charts',
            name: 'book-charts',
            component: () => import('@/pages/book-charts/index.vue')
        }
    ]
})

export default router
