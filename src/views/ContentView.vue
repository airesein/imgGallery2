<script setup>
import { ref, computed, inject, watch, nextTick, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import MediaCard from '../components/MediaCard.vue'
import MediaViewer from '../components/MediaViewer.vue'
import FullscreenViewer from '../components/FullscreenViewer.vue'
import { useFavorites } from '../composables/useFavorites.js'
import { useSwCache } from '../composables/useSwCache.js'
import { downloadItemsAsZip } from '../utils/batchDownload.js'
import { applyPageMeta, buildCategoryMeta } from '../utils/siteMeta.js'

const props = defineProps({ name: String })
const catalog = inject('catalog')
const uiState = inject('uiState')
const uiActions = inject('uiActions')
const settings = inject('settings')
const getItemUrl = inject('getItemUrl')
const flattenCategory = inject('flattenCategory')
const siteConfig = inject('siteConfig')

const BATCH = 30

const loadedCount = ref(BATCH)
const selectedItem = ref(null)
const fsIndex = ref(-1)
const isLoadingMore = ref(false)
const isDownloading = ref(false)
const sentinelRef = ref(null)
const selectedKeys = ref(new Set())

const { add } = useFavorites()
const sw = useSwCache()

let sentinelObserver = null
let resizeTimer = null

const category = computed(() => catalog.value.categories.find(c => c.name === props.name) || null)
const allItems = computed(() => category.value ? flattenCategory(category.value) : [])
const descriptionParagraphs = computed(() => {
  if (!category.value?.description) return []
  return category.value.description.split(/\n\n+/).filter(p => p.trim())
})
const visibleItems = computed(() => allItems.value.slice(0, loadedCount.value))
const hasMore = computed(() => loadedCount.value < allItems.value.length)
const columnCount = ref(getColumnCount())
const columns = computed(() => {
  const fixedCols = settings.value.columns
  if (fixedCols > 0) {
    const result = Array.from({ length: fixedCols }, () => [])
    visibleItems.value.forEach((item, index) => {
      result[index % fixedCols].push(item)
    })
    return result
  }
  const result = Array.from({ length: columnCount.value }, () => [])
  visibleItems.value.forEach((item, index) => {
    result[index % columnCount.value].push(item)
  })
  return result
})
const activeColCount = computed(() => {
  return settings.value.columns > 0 ? settings.value.columns : columnCount.value
})
const selectedItems = computed(() => allItems.value.filter(item => selectedKeys.value.has(getItemKey(item))))
const selectedIndex = computed(() => {
  if (!selectedItem.value) return -1
  return allItems.value.findIndex(i => i.id === selectedItem.value.id && i.source === selectedItem.value.source)
})

watch(
  [() => props.name, category, () => siteConfig.name, () => siteConfig.meta?.title, () => siteConfig.meta?.description],
  ([name, currentCategory]) => {
    if (!name) return
    applyPageMeta(buildCategoryMeta(siteConfig, name, currentCategory?.cover))
  },
  { immediate: true },
)

watch(() => props.name, reset)

watch(allItems, (items) => {
  uiState.currentCategory = props.name || ''
  uiState.currentCount = items.length
}, { immediate: true })

watch(selectedItems, (items) => {
  uiState.selectedCount = items.length
}, { immediate: true })

watch(() => uiState.selectionMode, (enabled) => {
  if (!enabled) selectedKeys.value = new Set()
})

watch(visibleItems, (items) => {
  const covers = items.map(i => getItemUrl(i, 'cover')).filter(Boolean)
  sw.setPriority(covers, 4)
})

watch(selectedItem, (item) => {
  if (!item) return
  const url = getItemUrl(item, 'display')
  if (url) sw.setPriority([url], 5)
})

function getItemKey(item) {
  return `${item.source}:${item.id}`
}

function getColumnCount() {
  const width = window.innerWidth
  if (width <= 560) return 1
  if (width <= 900) return 2
  if (width <= 1400) return 3
  return 4
}

function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    columnCount.value = getColumnCount()
  }, 120)
}

function isSelected(item) {
  return selectedKeys.value.has(getItemKey(item))
}

function toggleItemSelection(item) {
  const next = new Set(selectedKeys.value)
  const key = getItemKey(item)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selectedKeys.value = next
}

function onCardClick(item) {
  if (uiState.selectionMode) {
    toggleItemSelection(item)
    return
  }
  selectedItem.value = item
}

async function loadMore() {
  if (!hasMore.value || isLoadingMore.value) return
  isLoadingMore.value = true
  loadedCount.value = Math.min(allItems.value.length, loadedCount.value + BATCH)
  await nextTick()
  isLoadingMore.value = false
}

function observeSentinel() {
  sentinelObserver?.disconnect()
  if (!sentinelRef.value) return
  sentinelObserver = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) loadMore()
  }, {
    root: null,
    rootMargin: '800px 0px',
    threshold: 0,
  })
  sentinelObserver.observe(sentinelRef.value)
}

function setSelectionMode(enabled) {
  uiState.selectionMode = enabled
  if (!enabled) selectedKeys.value = new Set()
}

function clearSelection() {
  setSelectionMode(false)
}

function batchFavorite() {
  if (!selectedItems.value.length) return
  selectedItems.value.forEach(add)
  clearSelection()
}

async function batchDownload() {
  if (!selectedItems.value.length || isDownloading.value) return
  isDownloading.value = true
  uiState.downloadProgress = 0
  uiState.downloadTotal = selectedItems.value.length
  uiState.downloadFailures = 0
  uiState.downloadStatus = 'downloading'
  try {
    const failures = await downloadItemsAsZip(
      selectedItems.value,
      `${props.name || 'gallery'}-${Date.now()}`,
      (progress, total, fails, status) => {
        uiState.downloadProgress = progress
        uiState.downloadTotal = total
        uiState.downloadFailures = fails
        uiState.downloadStatus = status || 'downloading'
      },
      getItemUrl,
    )
    uiState.downloadStatus = 'done'
    if (failures.length) {
      window.alert(`打包完成，但有 ${failures.length} 个资源下载失败，可能是源站限制了浏览器直接抓取。`)
    }
    clearSelection()
  } catch {
    window.alert('打包失败：浏览器无法直接抓取这些资源，可能是跨域或源站限制导致。')
  } finally {
    isDownloading.value = false
    setTimeout(() => { uiState.downloadStatus = '' }, 1500)
  }
}

function bindUiActions() {
  uiActions.canSelect = true
  uiActions.toggleSelectionMode = () => setSelectionMode(!uiState.selectionMode)
  uiActions.clearSelection = clearSelection
  uiActions.batchFavorite = batchFavorite
  uiActions.batchDownload = batchDownload
}

function resetUiActions() {
  uiActions.canSelect = false
  uiActions.toggleSelectionMode = () => {}
  uiActions.clearSelection = () => {}
  uiActions.batchFavorite = async () => {}
  uiActions.batchDownload = async () => {}
}

function reset() {
  loadedCount.value = BATCH
  selectedItem.value = null
  fsIndex.value = -1
  isLoadingMore.value = false
  selectedKeys.value = new Set()
  uiState.currentCategory = props.name || ''
  uiState.currentCount = allItems.value.length
  uiState.selectedCount = 0
  uiState.selectionMode = false
  window.scrollTo({ top: 0, behavior: 'instant' })
  nextTick(observeSentinel)
}

function openFS(idx) {
  selectedItem.value = null
  fsIndex.value = idx >= 0 ? idx : 0
}

function setupSentinel() {
  if (sentinelObserver) {
    sentinelObserver.disconnect()
    sentinelObserver = null
  }
  observeSentinel()
}

onMounted(() => {
  bindUiActions()
  setupSentinel()
  window.addEventListener('resize', onResize, { passive: true })
})

onActivated(() => {
  bindUiActions()
  setupSentinel()
  window.addEventListener('resize', onResize, { passive: true })
})

onDeactivated(() => {
  sentinelObserver?.disconnect()
  sentinelObserver = null
  window.removeEventListener('resize', onResize)
  clearTimeout(resizeTimer)
  resetUiActions()
  uiState.selectionMode = false
  uiState.selectedCount = 0
})

onUnmounted(() => {
  sentinelObserver?.disconnect()
  window.removeEventListener('resize', onResize)
  clearTimeout(resizeTimer)
  resetUiActions()
  uiState.selectionMode = false
  uiState.selectedCount = 0
})
</script>

<template>
  <div class="cp">
    <div v-if="!category" class="cp-empty">分类不存在</div>
    <template v-else>
      <div v-if="category.description" class="cp-desc">
        <div class="cp-desc-inner">
          <div class="cp-desc-label">README</div>
          <div class="cp-desc-text">
            <p
              v-for="(para, i) in descriptionParagraphs"
              :key="i"
              :class="{ 'cp-desc-attribution': i === descriptionParagraphs.length - 1 }"
            >
              {{ para }}
            </p>
          </div>
        </div>
      </div>

      <div class="masonry" :style="{ gridTemplateColumns: `repeat(${activeColCount}, minmax(0, 1fr))`, gap: `${settings.cardGap}px` }">
        <div v-for="(column, columnIndex) in columns" :key="columnIndex" class="masonry-column">
          <div v-for="item in column" :key="`${item.source}:${item.id}`" class="masonry-item" :style="{ marginBottom: `${settings.cardGap}px` }">
            <MediaCard
              :item="item"
              :selectable="uiState.selectionMode"
              :selected="isSelected(item)"
              @click="onCardClick(item)"
            />
          </div>
        </div>
      </div>

      <div ref="sentinelRef" class="cp-sentinel">
        <span v-if="isDownloading" class="cp-loading">正在打包 zip...</span>
        <span v-else-if="isLoadingMore" class="cp-loading">加载中...</span>
        <span v-else-if="hasMore" class="cp-hint">继续下滑加载更多</span>
        <span v-else class="cp-end">到底了</span>
      </div>
    </template>

    <MediaViewer
      v-if="selectedItem"
      :item="selectedItem"
      @close="selectedItem = null"
      @fullscreen="openFS(selectedIndex)"
    />
    <FullscreenViewer
      v-if="fsIndex >= 0"
      :items="allItems"
      :current-index="fsIndex"
      @close="fsIndex = -1"
    />
  </div>
</template>

<style scoped>
.cp { padding: 68px 8px 40px; max-width: 1600px; margin: 0 auto; }
.cp-desc {
  margin: 0 0 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  border-left: 3px solid rgba(179,142,109,0.25);
}
.cp-desc-inner {
  padding: 16px 20px;
}
.cp-desc-label {
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 11px;
  letter-spacing: 0.15em;
  font-weight: 600;
  text-transform: uppercase;
}
.cp-desc-text p {
  margin: 0 0 0.3em;
  line-height: 1.5;
  color: var(--text-body);
}
.cp-desc-text p:last-child {
  margin-bottom: 0;
}
.cp-desc-attribution {
  text-align: right;
  color: var(--text-secondary);
  margin-top: 0.5em;
}
.cp-empty { text-align: center; padding: 80px 20px; color: rgba(30,32,34,0.2); font-size: 15px; }

.masonry {
  display: grid;
}

.masonry-column { min-width: 0; }

.cp-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  padding: 4px 0 14px;
}

.cp-loading {
  color: var(--color-loading-text);
  font-size: 14px;
  animation: pulse 1.2s ease-in-out infinite;
}

.cp-hint {
  color: rgba(30,32,34,0.12);
  font-size: 12px;
  letter-spacing: 0.06em;
}

.cp-end {
  color: rgba(30,32,34,0.08);
  font-size: 12px;
  letter-spacing: 0.1em;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>
