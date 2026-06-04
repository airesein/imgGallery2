import { createRouter, createWebHistory } from 'vue-router'
import CategoryView from '../views/CategoryView.vue'
import ContentView from '../views/ContentView.vue'
import FavoritesView from '../views/FavoritesView.vue'
import ApiDocsView from '../views/ApiDocsView.vue'
import AdminView from '../views/AdminView.vue'

const routes = [
  { path: '/', name: 'categories', component: CategoryView },
  { path: '/category/:name', name: 'content', component: ContentView, props: true },
  { path: '/favorites', name: 'favorites', component: FavoritesView },
  { path: '/docs', name: 'api-docs', component: ApiDocsView },
  { path: '/admin', name: 'admin', component: AdminView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, left: 0, behavior: 'instant' }
  },
})

export default router
