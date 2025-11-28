import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/pages/Dashboard.vue'

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
            component: () => import('@/pages/BookDetails.vue')
        },
        {
            path: '/book/:bookId/settings',
            name: 'book-settings',
            component: () => import('@/pages/BookSettings.vue')
        },
        {
            path: '/book/:bookId/:type/new',
            name: 'new-item',
            component: () => import('@/pages/ItemEdit.vue')
        },
        {
            path: '/book/:bookId/:type/:itemId/edit',
            name: 'edit-item',
            component: () => import('@/pages/ItemEdit.vue')
        },
        {
            path: '/book/:bookId/products/:productId/history',
            name: 'product-rates-history',
            component: () => import('@/pages/ProductRatesHistory.vue')
        },
        {
            path: '/book/:bookId/transaction/create',
            name: 'create-transaction',
            component: () => import('@/pages/TransactionForm.vue')
        },
        {
            path: '/book/:bookId/transaction/:id/edit',
            name: 'edit-transaction',
            component: () => import('@/pages/TransactionForm.vue')
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('@/pages/Settings.vue')
        },
        {
            path: '/settings/contacts/new',
            name: 'new-contact',
            component: () => import('@/pages/ContactEdit.vue')
        },
        {
            path: '/settings/contacts/:id/edit',
            name: 'edit-contact',
            component: () => import('@/pages/ContactEdit.vue')
        }
    ]
})

export default router
