import { createRouter, createWebHistory } from 'vue-router'
import Servers from './views/Servers.vue'
import Space from './views/Space.vue'

const routes = [
  { path: '/', redirect: '/servers' },
  { path: '/servers', component: Servers },
  { path: '/space', component: Space }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router