<script setup>
import { ref, reactive, provide, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import yaml from 'js-yaml'
import FloatingNav from './components/FloatingNav.vue'
import DownloadPanel from './components/DownloadPanel.vue'
import { useSettings } from './composables/useSettings.js'
import { useCatalog } from './composables/useCatalog.js'
import { useSwCache } from './composables/useSwCache.js'
import { useToast } from './composables/useToast.js'
import { applyPageMeta, buildFavoritesMeta, buildHomeMeta, buildCategoryMeta } from './utils/siteMeta.js'

const { catalog, rules, getItemUrl, getItemType, getItemDownload, isVideo, flattenCategory } = useCatalog()
const loading = ref(true)
const error = ref(false)

const categoryCovers = computed(() => {
  if (!catalog.value?.categories) return []
  return catalog.value.categories.map(c => ({ name: c.name, cover: c.cover, total: c.total }))
})

const uiState = reactive({
  searchQuery: '',
  currentCategory: '',
  currentCount: 0,
  selectionMode: false,
  selectedCount: 0,
  downloadProgress: 0,
  downloadTotal: 0,
  downloadFailures: 0,
  downloadStatus: '',
})

const uiActions = reactive({
  canSelect: false,
  toggleSelectionMode: () => {},
  clearSelection: () => {},
  batchFavorite: async () => {},
  batchDownload: async () => {},
})

const { settings, set, reset, saveAsDefaults, applySiteDefaults } = useSettings()
const sw = useSwCache()
const route = useRoute()

const showSettings = ref(false)
const previewActive = ref(false)
provide('previewActive', previewActive)

const { toasts, showToast, removeToast } = useToast()
provide('showToast', showToast)

const siteConfig = reactive({
  name: 'Ziworld',
  url: '',
  description: '',
  keywords: '',
  favicon: '/favicon.ico',
  meta: { title: '', description: '', ogImage: '' },
  github: { show: false, url: '' },
})
provide('siteConfig', siteConfig)

provide('catalog', catalog)
provide('uiState', uiState)
provide('uiActions', uiActions)
provide('settings', settings)
provide('setSetting', set)
provide('resetSettings', reset)
provide('saveAsDefaults', saveAsDefaults)
provide('getItemUrl', getItemUrl)
provide('getItemType', getItemType)
provide('getItemDownload', getItemDownload)
provide('isVideo', isVideo)
provide('flattenCategory', flattenCategory)
provide('categoryCovers', categoryCovers)
provide('showSettings', showSettings)

onMounted(async () => {
  try {
    const res = await fetch('/catalog.json')
    if (!res.ok) throw new Error('Failed to load catalog')
    const data = await res.json()
    rules.value = data.rules || {}
    catalog.value = data
  } catch (e) {
    console.error(e)
    error.value = true
  } finally {
    loading.value = false
  }

  try {
    const cfgRes = await fetch('/config.yml')
    if (cfgRes.ok) {
      const cfg = yaml.load(await cfgRes.text())
      Object.assign(siteConfig, cfg)
      if (cfg.settings) applySiteDefaults(cfg.settings)

      if (route.path === '/') {
        applyPageMeta(buildHomeMeta(siteConfig))
      } else if (route.path === '/favorites') {
        applyPageMeta(buildFavoritesMeta(siteConfig))
      } else if (route.params?.name) {
        const currentCategory = catalog.value?.categories?.find(c => c.name === route.params.name)
        applyPageMeta(buildCategoryMeta(siteConfig, route.params.name, currentCategory?.cover))
      } else {
        applyPageMeta(buildHomeMeta(siteConfig))
      }
    }
  } catch (e) {
    console.error('Failed to load site config', e)
  }

  sw.init()
})
</script>

<template>
  <FloatingNav />
  <DownloadPanel />
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" :class="['toast-item', `toast-${t.type}`]">
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
  <main>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">数据加载失败，请刷新重试</div>
    <RouterView v-slot="{ Component }" v-else-if="catalog">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </main>
</template>

<style>
.toast-container {
  position: fixed; bottom: 14px; right: 14px; z-index: 9999;
  display: flex; flex-direction: column; gap: 6px;
  pointer-events: none;
}
.toast-item {
  padding: 8px 16px; border-radius: 8px;
  background: var(--bg-overlay); backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-subtle);
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  font-size: 13px; color: var(--text-primary);
  pointer-events: auto;
  white-space: nowrap;
}
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from { opacity: 0; transform: translateX(20px); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
</style>
