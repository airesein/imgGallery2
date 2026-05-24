<script setup>
import { computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const catalog = inject('catalog')
const uiState = inject('uiState')
const uiActions = inject('uiActions')

const isCatView = computed(() => route.name === 'categories')
const isFavView = computed(() => route.name === 'favorites')
const currentCategory = computed(() => {
  if (!catalog.value || !route.params.name) return null
  return catalog.value.categories.find(c => c.name === route.params.name) || null
})

const downloadPercent = computed(() => {
  if (!uiState.downloadTotal) return 0
  return Math.round((uiState.downloadProgress / uiState.downloadTotal) * 100)
})

const tickCount = computed(() => {
  const total = uiState.downloadTotal
  if (total <= 1) return 1
  if (total <= 5) return total
  return Math.min(total, 12)
})

const filledTicks = computed(() => {
  const total = uiState.downloadTotal
  if (!total) return 0
  return Math.ceil((uiState.downloadProgress / total) * tickCount.value)
})

function goToCategories() { uiState.searchQuery = ''; router.push('/') }
</script>

<template>
  <nav v-if="!isCatView" class="nav-pill">
    <button class="nav-back" @click="goToCategories">
      {{ isFavView ? '收藏' : (currentCategory?.name || '分类') }}
    </button>

    <span class="nav-count">{{ uiState.currentCount }} 项</span>

    <div class="nav-actions">
      <template v-if="!uiState.selectionMode">
        <button class="nav-action-btn" @click="uiActions.toggleSelectionMode()">选择</button>
      </template>
      <template v-else>
        <span v-if="uiState.downloadStatus === 'downloading' || uiState.downloadStatus === 'generating'" class="nav-progress-wrap">
          <span class="nav-progress-text">{{ uiState.downloadStatus === 'generating' ? '打包中' : `${downloadPercent}%` }}</span>
          <span class="nav-progress-track">
            <span
              v-for="t in tickCount"
              :key="t"
              class="nav-tick"
              :class="{ filled: t <= filledTicks }"
            ></span>
          </span>
        </span>
        <template v-else>
          <span class="nav-selected">已选 {{ uiState.selectedCount }}</span>
          <button class="nav-action-btn" :disabled="uiState.selectedCount === 0" @click="uiActions.batchDownload()">下载</button>
          <button class="nav-action-btn" :disabled="uiState.selectedCount === 0" @click="uiActions.batchFavorite()">{{ isFavView ? '取消收藏' : '收藏' }}</button>
          <button class="nav-action-btn" @click="uiActions.clearSelection()">取消</button>
        </template>
      </template>
    </div>
  </nav>
</template>

<style scoped>
.nav-pill {
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
  z-index: 100; padding: 6px 16px; min-height: 38px;
  display: flex; align-items: center; gap: 10px;
  background: rgba(252,251,250,0.88); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle); border-radius: 100px;
  max-width: 94vw;
}

.nav-back {
  background: none; border: none; color: var(--text-body); font-size: 14px; font-weight: 600;
  cursor: pointer; padding: 3px 10px; border-radius: 16px; white-space: nowrap;
  transition: background 0.15s;
}
.nav-back:hover { background: rgba(30,32,34,0.05); }

.nav-count { color: var(--text-muted); font-size: 12px; white-space: nowrap; }

.nav-actions { display: flex; align-items: center; gap: 6px; }
.nav-action-btn {
  height: 28px; padding: 0 12px; border-radius: 999px; border: none;
  background: rgba(30,32,34,0.06); color: var(--text-secondary);
  font-size: 12px; cursor: pointer; transition: all 0.15s;
  white-space: nowrap;
}
.nav-action-btn:hover:not(:disabled) { background: rgba(30,32,34,0.1); color: var(--text-primary); }
.nav-action-btn:disabled { opacity: 0.3; cursor: default; }
.nav-selected { color: var(--text-secondary); font-size: 12px; white-space: nowrap; }

.nav-progress-wrap {
  display: flex; align-items: center; gap: 8px; min-width: 140px;
}
.nav-progress-text {
  color: var(--text-secondary); font-size: 11px; white-space: nowrap; min-width: 36px;
  font-weight: 600; font-variant-numeric: tabular-nums;
}
.nav-progress-track { display: flex; align-items: center; gap: 2px; }
.nav-tick {
  display: block; width: 12px; height: 6px; border-radius: 2px;
  background: rgba(30,32,34,0.08); transition: background 0.15s ease, transform 0.15s ease;
}
.nav-tick.filled { background: linear-gradient(180deg, var(--color-accent), #d4c5b5); transform: scaleY(1.05); }

@media (max-width: 600px) {
  .nav-pill { gap: 8px; padding: 6px 10px; }
  .nav-count { display: none; }
  .nav-action-btn { padding: 0 10px; font-size: 11px; }
  .nav-progress-wrap { min-width: 130px; }
  .nav-tick { width: 8px; height: 5px; }
}
</style>
