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
            path: '/book/:bookId/transaction/new',
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
        }
    ]
})

export default router
