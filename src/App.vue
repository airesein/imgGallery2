<script setup>
import { ref, reactive, provide, onMounted, computed } from 'vue'
import FloatingNav from './components/FloatingNav.vue'
import { useSettings } from './composables/useSettings.js'
import { useCatalog } from './composables/useCatalog.js'

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

const { settings, set, reset } = useSettings()

provide('catalog', catalog)
provide('uiState', uiState)
provide('uiActions', uiActions)
provide('settings', settings)
provide('setSetting', set)
provide('resetSettings', reset)
provide('getItemUrl', getItemUrl)
provide('getItemType', getItemType)
provide('getItemDownload', getItemDownload)
provide('isVideo', isVideo)
provide('flattenCategory', flattenCategory)
provide('categoryCovers', categoryCovers)

function setMeta(name, content) {
  if (!content) return
  let el = document.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setProperty(prop, content) {
  if (!content) return
  let el = document.querySelector(`meta[property="${prop}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', prop)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setFavicon(href) {
  if (!href) return
  let link = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = href
}

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
    const cfgRes = await fetch('/site-config.json')
    if (cfgRes.ok) {
      const cfg = await cfgRes.json()
      if (cfg.name) {
        document.title = cfg.name
        setProperty('og:title', cfg.name)
        setMeta('twitter:title', cfg.name)
      }
      if (cfg.description) {
        setMeta('description', cfg.description)
        setProperty('og:description', cfg.description)
        setMeta('twitter:description', cfg.description)
      }
      if (cfg.keywords) setMeta('keywords', cfg.keywords)
      if (cfg.ogImage) setProperty('og:image', cfg.ogImage)
      if (cfg.favicon) setFavicon(cfg.favicon)
    }
  } catch (e) {
    console.error('Failed to load site config', e)
  }
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
