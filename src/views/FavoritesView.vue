<script setup>
import { ref, computed, inject, watch, nextTick, onMounted, onUnmounted } from 'vue'
import MediaCard from '../components/MediaCard.vue'
import MediaViewer from '../components/MediaViewer.vue'
import FullscreenViewer from '../components/FullscreenViewer.vue'
import { useFavorites } from '../composables/useFavorites.js'
import { downloadItemsAsZip } from '../utils/batchDownload.js'

const uiState = inject('uiState')
const uiActions = inject('uiActions')
const settings = inject('settings')
const getItemUrl = inject('getItemUrl')

const { favorites, remove } = useFavorites()

const BATCH = 30
const loadedCount = ref(BATCH)
const sentinelRef = ref(null)
const isLoadingMore = ref(false)
const isDownloading = ref(false)
const selectedKeys = ref(new Set())
const selectedItem = ref(null)
const fsIndex = ref(-1)

let sentinelObserver = null
let resizeTimer = null

const allItems = computed(() => favorites.value)
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

const hasAny = computed(() => allItems.value.length > 0)
const selectedIndex = computed(() => {
  if (!selectedItem.value) return -1
  return allItems.value.findIndex(i => i.id === selectedItem.value.id && i.source === selectedItem.value.source)
})

watch(allItems, (items) => {
  uiState.currentCategory = '收藏'
  uiState.currentCount = items.length
}, { immediate: true })

watch(selectedItems, (items) => {
  uiState.selectedCount = items.length
}, { immediate: true })

watch(() => uiState.selectionMode, (enabled) => {
  if (!enabled) selectedKeys.value = new Set()
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
  }, { root: null, rootMargin: '800px 0px', threshold: 0 })
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
  selectedItems.value.forEach(remove)
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
      `favorites-${Date.now()}`,
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
  uiActions.batchFavorite = batchFavorite // In favorites view: this means "取消收藏"
  uiActions.batchDownload = batchDownload
}

function resetUiActions() {
  uiActions.canSelect = false
  uiActions.toggleSelectionMode = () => {}
  uiActions.clearSelection = () => {}
  uiActions.batchFavorite = async () => {}
  uiActions.batchDownload = async () => {}
}

function openFS(idx) {
  selectedItem.value = null
  fsIndex.value = idx >= 0 ? idx : 0
}

onMounted(() => {
  loadedCount.value = BATCH
  bindUiActions()
  observeSentinel()
  window.addEventListener('resize', onResize, { passive: true })
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
  <div class="fv">
    <div v-if="!hasAny" class="fv-empty">还没有收藏的内容</div>
    <template v-else>
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
      <div ref="sentinelRef" class="fv-sentinel">
        <span v-if="isDownloading" class="fv-loading">正在打包 zip...</span>
        <span v-else-if="isLoadingMore" class="fv-loading">加载中...</span>
        <span v-else-if="hasMore" class="fv-hint">继续下滑加载更多</span>
        <span v-else class="fv-end">— 到底了 —</span>
      </div>
    </template>

    <MediaViewer v-if="selectedItem" :item="selectedItem" @close="selectedItem = null" @fullscreen="openFS(selectedIndex)" />
    <FullscreenViewer v-if="fsIndex >= 0" :items="allItems" :current-index="fsIndex" @close="fsIndex = -1" />
  </div>
</template>

<style scoped>
.fv { padding: 68px 8px 48px; max-width: 1600px; margin: 0 auto; }
.fv-empty { text-align: center; padding: 80px 20px; color: rgba(255,255,255,0.35); font-size: 15px; }
.masonry {
  display: grid;
}
.masonry-column { min-width: 0; }

.fv-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  padding: 4px 0 14px;
}
.fv-loading {
  color: rgba(255,255,255,0.45);
  font-size: 14px;
  animation: pulse 1.2s ease-in-out infinite;
}
.fv-hint { color: rgba(255,255,255,0.16); font-size: 12px; letter-spacing: 0.06em; }
.fv-end { color: rgba(255,255,255,0.12); font-size: 12px; letter-spacing: 0.1em; }

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>
