<script setup>
import { computed, inject, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const catalog = inject('catalog')
const uiState = inject('uiState')
const uiActions = inject('uiActions')
const settings = inject('settings')
const setSetting = inject('setSetting')
const resetSettings = inject('resetSettings')

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

const showSettings = ref(false)

function toggleSettings() {
  showSettings.value = !showSettings.value
}
</script>

<template>
  <nav class="nav-pill" :class="{ wide: isCatView }">
    <template v-if="isCatView">
      <div class="nav-search-wrap">
        <input v-model="uiState.searchQuery" class="nav-search" type="text" placeholder="搜索分类..." />
      </div>
      <button class="nav-hamburger" @click="toggleSettings" aria-label="设置">
        <span></span><span></span><span></span>
      </button>
    </template>

    <template v-else>
      <button class="nav-back" @click="goToCategories">
        {{ isFavView ? '收藏' : (currentCategory?.name || '分类') }}
      </button>

      <span class="nav-count">{{ uiState.currentCount }} 项</span>

      <div v-if="uiActions.canSelect" class="nav-actions">
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
    </template>
  </nav>

  <Transition name="settings-fade">
    <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
      <div class="settings-panel">
        <div class="settings-header">
          <h3>设置</h3>
          <button class="settings-close" @click="showSettings = false">&times;</button>
        </div>

        <div class="settings-body">
          <div class="settings-row">
            <label class="settings-label">卡片间距 <span class="settings-value">({{ settings.cardGap }}px)</span></label>
            <input type="range" class="settings-range" min="6" max="20" :value="settings.cardGap" @input="setSetting('cardGap', Number($event.target.value))" />
          </div>

          <div class="settings-row">
            <label class="settings-label">列数 <span class="settings-value">({{ settings.columns === 0 ? '自动' : settings.columns }})</span></label>
            <input type="range" class="settings-range" min="0" max="6" :value="settings.columns" @input="setSetting('columns', Number($event.target.value))" />
          </div>

          <div class="settings-row">
            <button class="settings-reset" @click="resetSettings">恢复默认</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.nav-pill {
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
  z-index: 100; padding: 6px 16px; min-height: 38px;
  display: flex; align-items: center; gap: 10px;
  background: rgba(13,13,13,0.82); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.07); border-radius: 100px;
  max-width: 94vw;
}
.nav-pill.wide { min-width: 300px; }

.nav-search-wrap { width: 100%; }
.nav-search {
  width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px; padding: 7px 16px; color: #e0e0e0; font-size: 14px; outline: none;
}
.nav-search::placeholder { color: rgba(255,255,255,0.3); }
.nav-search:focus { border-color: rgba(255,255,255,0.25); }

.nav-hamburger {
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  width: 32px; height: 32px; background: none; border: none; cursor: pointer; padding: 4px;
  border-radius: 8px; transition: background 0.15s; flex-shrink: 0;
}
.nav-hamburger:hover { background: rgba(255,255,255,0.08); }
.nav-hamburger span {
  display: block; width: 18px; height: 2px; background: rgba(255,255,255,0.7);
  border-radius: 1px; transition: all 0.2s;
}
.nav-hamburger span + span { margin-top: 3px; }

.nav-back {
  background: none; border: none; color: #e0e0e0; font-size: 14px; font-weight: 600;
  cursor: pointer; padding: 3px 10px; border-radius: 16px; white-space: nowrap;
  transition: background 0.15s;
}
.nav-back:hover { background: rgba(255,255,255,0.08); }

.nav-count { color: rgba(255,255,255,0.35); font-size: 12px; white-space: nowrap; }
.nav-actions { display: flex; align-items: center; gap: 6px; }
.nav-action-btn {
  height: 28px; padding: 0 12px; border-radius: 999px; border: none;
  background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8);
  font-size: 12px; cursor: pointer; transition: all 0.15s;
  white-space: nowrap;
}
.nav-action-btn:hover:not(:disabled) { background: rgba(255,255,255,0.14); color: #fff; }
.nav-action-btn:disabled { opacity: 0.3; cursor: default; }
.nav-selected { color: rgba(255,255,255,0.7); font-size: 12px; white-space: nowrap; }

.nav-progress-wrap {
  display: flex; align-items: center; gap: 8px;
  min-width: 140px;
}
.nav-progress-text {
  color: rgba(255,255,255,0.72); font-size: 11px; white-space: nowrap; min-width: 36px;
  font-weight: 600; font-variant-numeric: tabular-nums;
}
.nav-progress-track {
  display: flex; align-items: center; gap: 2px;
}
.nav-tick {
  display: block;
  width: 12px; height: 6px; border-radius: 2px;
  background: rgba(255,255,255,0.12);
  transition: background 0.15s ease, transform 0.15s ease;
}
.nav-tick.filled {
  background: linear-gradient(180deg, #70a4ff, #a78bfa);
  transform: scaleY(1.05);
}

.settings-overlay {
  position: fixed; inset: 0; z-index: 999;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 60px;
  background: rgba(0,0,0,0.4);
}
.settings-panel {
  background: rgba(20,20,20,0.95);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  width: min(360px, 90vw);
  box-shadow: 0 16px 48px rgba(0,0,0,0.4);
}
.settings-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.07);
}
.settings-header h3 { color: #e0e0e0; font-size: 15px; font-weight: 600; }
.settings-close {
  background: none; border: none; color: rgba(255,255,255,0.5); font-size: 22px;
  cursor: pointer; padding: 0 4px; line-height: 1;
}
.settings-close:hover { color: #fff; }
.settings-body { padding: 16px 18px; }
.settings-row { margin-bottom: 16px; }
.settings-row:last-child { margin-bottom: 0; }
.settings-label {
  display: block; color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 8px;
}
.settings-value { color: rgba(255,255,255,0.4); font-weight: normal; }
.settings-range {
  width: 100%; accent-color: #70a4ff; cursor: pointer;
}
.settings-reset {
  width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7);
  font-size: 13px; cursor: pointer; transition: all 0.15s;
}
.settings-reset:hover { background: rgba(255,255,255,0.12); color: #fff; }

.settings-fade-enter-active,
.settings-fade-leave-active { transition: opacity 0.2s; }
.settings-fade-enter-from,
.settings-fade-leave-to { opacity: 0; }

@media (max-width: 600px) {
  .nav-pill { gap: 8px; padding: 6px 10px; }
  .nav-count { display: none; }
  .nav-action-btn { padding: 0 10px; font-size: 11px; }
  .nav-progress-wrap { min-width: 130px; }
  .nav-tick { width: 8px; height: 5px; }
}
</style>
