<script setup>
import { ref, computed, inject, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import CategoryCard from '../components/CategoryCard.vue'
import SettingsDialog from '../components/SettingsDialog.vue'
import ShortcutHelp from '../components/ShortcutHelp.vue'
import { useFavorites } from '../composables/useFavorites.js'
import { useSwCache } from '../composables/useSwCache.js'
import { applyPageMeta, buildHomeMeta } from '../utils/siteMeta.js'

const catalog = inject('catalog')
const uiState = inject('uiState')
const uiActions = inject('uiActions')
const settings = inject('settings')
const setSetting = inject('setSetting')
const resetSettings = inject('resetSettings')
const showSettings = inject('showSettings')
const siteConfig = inject('siteConfig')
const router = useRouter()
const { favorites } = useFavorites()
const sw = useSwCache()
const showShortcutHelp = ref(false)
const mobileExpanded = ref(false)

const columns = ref([])
const colCountRef = ref(4)
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 600)

const categoryCovers = computed(() => {
  if (!catalog.value?.categories) return []
  return catalog.value.categories.map(c => ({ name: c.name, cover: c.cover, total: c.total }))
})

const filtered = computed(() => {
  const covers = categoryCovers.value
  const q = uiState.searchQuery.trim().toLowerCase()
  if (!q) return covers
  return covers.filter(c => c.name.toLowerCase().includes(q))
})

function getColCount() {
  const cols = settings.value.columns
  if (cols > 0) return Math.max(1, cols)
  const w = windowWidth.value
  if (w <= 580) return 1
  if (w <= 880) return 2
  if (w <= 1200) return 3
  return 4
}

function distributeCards() {
  const items = filtered.value
  const n = getColCount()
  colCountRef.value = n
  const cols = Array.from({ length: n }, () => [])
  items.forEach((item, i) => {
    cols[i % n].push(item)
  })
  columns.value = cols
}

function openCategory(name) {
  router.push(`/category/${encodeURIComponent(name)}`)
}

watchEffect(() => {
  distributeCards()
})

watchEffect(() => {
  uiActions.canSelect = false
  uiState.selectionMode = false
  uiState.selectedCount = 0
})

watchEffect(() => {
  applyPageMeta(buildHomeMeta(siteConfig))
})

let resizeTimer = null
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    windowWidth.value = window.innerWidth
  }, 150)
}

onMounted(() => {
  window.addEventListener('resize', onResize, { passive: true })
  const covers = categoryCovers.value.map(c => c.cover).filter(Boolean)
  sw.setPriority(covers, 1)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(resizeTimer)
})
</script>

<template>
  <div class="cat-page">
    <div class="cat-header">
      <h1 class="cat-title">{{ siteConfig.name }}</h1>
      <p v-if="siteConfig.description" class="cat-description">{{ siteConfig.description }}</p>
      <div class="cat-stats">
        <span>{{ categoryCovers.length }} CATEGORIES</span>
        <span class="cat-dot">•</span>
        <span>{{ categoryCovers.reduce((s, c) => s + c.total, 0).toLocaleString() }} ITEMS</span>
      </div>
      <div class="cat-search-wrap">
        <svg class="cat-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input v-model="uiState.searchQuery" class="cat-search" type="text" placeholder="Search categories..." />
      </div>
    </div>

    <div class="cat-sidebar" :class="{ expanded: mobileExpanded }">
      <button class="cat-sidebar-btn cat-more-toggle" @click="mobileExpanded = !mobileExpanded">
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      <a v-if="siteConfig.github?.show" :href="siteConfig.github.url" target="_blank" rel="noopener noreferrer" class="cat-sidebar-btn cat-sidebar-item" aria-label="GitHub" data-tooltip="GitHub">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      </a>
      <button class="cat-sidebar-btn cat-sidebar-item" @click="showSettings = !showSettings" aria-label="Settings" data-tooltip="设置">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      </button>
      <button class="cat-sidebar-btn cat-sidebar-item" @click="showShortcutHelp = !showShortcutHelp" aria-label="Shortcuts" data-tooltip="快捷键">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="7" y2="12"></line><line x1="10" y1="12" x2="14" y2="12"></line><line x1="17" y1="12" x2="18" y2="12"></line><line x1="6" y1="16" x2="8" y2="16"></line><line x1="13" y1="16" x2="18" y2="16"></line></svg>
      </button>
      <a href="/docs" class="cat-sidebar-btn cat-sidebar-item" aria-label="API" data-tooltip="API文档">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
      </a>
    </div>

    <div class="cat-grid" :style="{ gridTemplateColumns: `repeat(${colCountRef}, 1fr)`, gap: `${settings.cardGap}px` }">
      <template v-for="(col, colIdx) in columns" :key="colIdx">
        <div class="cat-col">
          <div v-if="colIdx === 0" class="cat-fav-card" :style="{ marginBottom: `${settings.cardGap}px` }" @click="router.push('/favorites')">
            <div class="cat-fav-inner">
              <svg class="cat-fav-icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span class="cat-fav-label">Favorites</span>
              <span class="cat-fav-count">{{ favorites.length }} Items</span>
            </div>
          </div>
          <CategoryCard
            v-for="cat in col"
            :key="cat.name"
            :name="cat.name"
            :cover="cat.cover"
            :count="cat.total"
            :style="{ marginBottom: `${settings.cardGap}px` }"
            @click="openCategory(cat.name)"
          />
        </div>
      </template>
    </div>
    <div v-if="filtered.length === 0 && catalog" class="cat-empty">No matching categories</div>
    <div v-else-if="!catalog" class="cat-empty">Loading...</div>

    <SettingsDialog />
    <ShortcutHelp v-if="showShortcutHelp" @close="showShortcutHelp = false" />
  </div>
</template>

<style scoped>
.cat-page {
  padding: 60px 16px 80px;
}

.cat-header {
  text-align: center;
  margin-bottom: 60px;
}

.cat-title {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.cat-description {
  max-width: 640px;
  margin: 0 auto 18px;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.7;
}

.cat-stats {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}

.cat-dot { color: rgba(30,32,34,0.1); }

.cat-search-wrap {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.cat-search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}

.cat-search {
  width: 100%;
  background: transparent;
  border: 1px solid rgba(30,32,34,0.08);
  border-radius: 6px;
  padding: 12px 16px 12px 42px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.cat-search::placeholder { color: var(--text-muted); }
.cat-search:focus { border-color: rgba(179,142,109,0.3); }

.cat-sidebar {
  position: fixed;
  right: 12px;
  top: 56px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 50;
}
.cat-sidebar-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-overlay);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.2s, border-color 0.2s;
}
.cat-sidebar-btn:hover {
  color: var(--text-primary);
  border-color: rgba(30,32,34,0.12);
}
.cat-sidebar-btn svg {
  width: 18px;
  height: 18px;
}
.cat-sidebar-item {
  position: relative;
}
.cat-sidebar-item::after {
  content: attr(data-tooltip);
  position: absolute;
  right: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(6px);
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease, transform 0.22s ease;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.cat-sidebar-item:hover::after {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}
.cat-more-toggle { display: none; }
@media (max-width: 600px) {
  .cat-more-toggle { display: flex; }
  .cat-sidebar-item { display: none; }
  .cat-sidebar.expanded .cat-sidebar-item { display: flex; }
}

.cat-grid {
  display: grid;
}
.cat-col {
  display: flex;
  flex-direction: column;
}

.cat-empty {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-muted);
  font-size: 14px;
}

.cat-fav-card {
  position: relative;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  min-height: 220px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, border-color 0.2s;
}
.cat-fav-card:hover {
  background: #eeebe6;
  border-color: rgba(30,32,34,0.1);
}

.cat-fav-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.cat-fav-icon { width: 24px; height: 24px; color: var(--text-primary); }
.cat-fav-label { font-size: 14px; font-weight: 500; color: var(--text-primary); letter-spacing: 0.02em; }
.cat-fav-count { font-size: 12px; color: var(--text-secondary); }
</style>
