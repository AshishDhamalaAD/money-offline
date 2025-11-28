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
            name: 'book-settings',
            component: () => import('@/pages/book-settings/index.vue')
        },
        {
            path: '/book/:bookId/:type/new',
            name: 'new-item',
            component: () => import('@/pages/item-edit/index.vue')
        },
        {
            path: '/book/:bookId/:type/:itemId/edit',
            name: 'edit-item',
            component: () => import('@/pages/item-edit/index.vue')
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
        }
    ]
})

export default router
