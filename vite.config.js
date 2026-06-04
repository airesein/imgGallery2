import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { ssgPlugin } from './scripts/vite-plugin-ssg.mjs'
import { apiPlugin } from './scripts/vite-plugin-api.mjs'

export default defineConfig({
  base: '/',
  plugins: [vue(), ssgPlugin(), apiPlugin()],
})
