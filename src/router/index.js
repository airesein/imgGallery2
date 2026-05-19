import { createRouter, createWebHashHistory } from 'vue-router'
import CategoryView from '../views/CategoryView.vue'
import ContentView from '../views/ContentView.vue'
import FavoritesView from '../views/FavoritesView.vue'

const routes = [
  { path: '/', name: 'categories', component: CategoryView },
  { path: '/category/:name', name: 'content', component: ContentView, props: true },
  { path: '/favorites', name: 'favorites', component: FavoritesView }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, left: 0, behavior: 'instant' }
  },
})

export default router
