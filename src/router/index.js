import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'

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
            component: () => import('../views/BookDetails.vue')
        },
        {
            path: '/book/:bookId/settings',
            name: 'book-settings',
            component: () => import('../views/BookSettings.vue')
        },
        {
            path: '/book/:bookId/:type/new',
            name: 'new-item',
            component: () => import('../views/ItemEdit.vue')
        },
        {
            path: '/book/:bookId/:type/:itemId/edit',
            name: 'edit-item',
            component: () => import('../views/ItemEdit.vue')
        },
        {
            path: '/book/:bookId/transaction/create',
            name: 'create-transaction',
            component: () => import('../views/TransactionForm.vue')
        },
        {
            path: '/book/:bookId/transaction/:id/edit',
            name: 'edit-transaction',
            component: () => import('../views/TransactionForm.vue')
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('../views/Settings.vue')
        },
        {
            path: '/settings/contacts/new',
            name: 'new-contact',
            component: () => import('../views/ContactEdit.vue')
        },
        {
            path: '/settings/contacts/:id/edit',
            name: 'edit-contact',
            component: () => import('../views/ContactEdit.vue')
        }
    ]
})

export default router
