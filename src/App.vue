<script setup>
import { ref, reactive, provide, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import yaml from 'js-yaml'
import FloatingNav from './components/FloatingNav.vue'
import { useSettings } from './composables/useSettings.js'
import { useCatalog } from './composables/useCatalog.js'
import { useSwCache } from './composables/useSwCache.js'
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
