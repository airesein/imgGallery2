<script setup>
import { ref, computed, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useDownload } from '../composables/useDownload.js'

const { tasks, retry, rm } = useDownload()
const route = useRoute()
const previewActive = inject('previewActive', ref(false))
const expanded = ref(false)

const activeTasks = computed(() => tasks.value.filter(t => t.status === 'downloading'))
const allProgress = computed(() => {
  const list = tasks.value.filter(t => t.status === 'downloading')
  if (!list.length) return 0
  const w = list.reduce((s, t) => s + t.progress * t.total, 0)
  const c = list.reduce((s, t) => s + t.total, 0)
  return c ? Math.round(w / c) : 0
})
</script>

<template>
  <div class="dl-root" v-if="!previewActive && route.name !== 'api-docs' && route.name !== 'admin'">
    <button class="dl-trigger" @click.stop="expanded = !expanded">
      <svg class="dl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      <svg v-if="activeTasks.length" class="dl-ring" viewBox="0 0 36 36">
        <rect x="2" y="2" width="32" height="32" rx="8" fill="none" stroke-width="3" stroke-linecap="round" class="dl-ring-bg"/>
        <rect x="2" y="2" width="32" height="32" rx="8" fill="none" stroke-width="3" stroke-linecap="round" class="dl-ring-fg"
          pathLength="100" :stroke-dasharray="100" :stroke-dashoffset="100 - allProgress"/>
      </svg>
    </button>

    <div v-if="expanded" class="dl-backdrop" @click="expanded = false"></div>

    <Transition name="dl-d">
      <div v-if="expanded" class="dl-dropdown" @click.stop>
        <div v-if="!tasks.length" class="dl-empty">暂无下载任务</div>
        <div v-for="t in tasks" :key="t.id" class="dl-task">
          <div class="dl-head">
            <span class="dl-name">{{ t.name }}</span>
            <span v-if="t.status === 'done'" class="dl-badge dl-ok">完成</span>
            <span v-if="t.status === 'error'" class="dl-badge dl-err">失败</span>
            <button v-if="t.status === 'error'" class="dl-btn dl-retry" @click="retry(t)">重试</button>
            <button v-if="t.status === 'downloading'" class="dl-btn" @click="t.cancel?.()">取消</button>
          </div>
          <div v-if="t.status === 'downloading'" class="dl-bar"><div class="dl-bar-fill" :style="{ width: t.progress + '%' }"></div></div>
          <div v-if="t.status === 'downloading'" class="dl-info">{{ t.current }}/{{ t.total }} {{ t.progress }}%</div>
          <div v-if="t.status === 'error'" class="dl-info dl-err-text">请检查网络，使用中国大陆网络</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dl-root { position: fixed; right: 12px; top: 12px; z-index: 998; }
.dl-backdrop { position: fixed; inset: 0; z-index: -1; }
.dl-trigger {
  position: relative; width: 36px; height: 36px; border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-overlay); backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--text-muted);
}
.dl-trigger:hover { color: var(--text-primary); border-color: rgba(30,32,34,0.12); }
.dl-icon { width: 18px; height: 18px; }
.dl-ring { position: absolute; inset: -1px; width: calc(100% + 2px); height: calc(100% + 2px); }
.dl-ring-bg { stroke: var(--border-subtle); }
.dl-ring-fg { stroke: var(--color-accent); transition: stroke-dashoffset 0.3s ease; }

.dl-dropdown {
  position: absolute; right: 0; top: 44px; width: 260px;
  background: var(--bg-overlay); backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-subtle); border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12); overflow: hidden;
}
.dl-empty { padding: 20px; text-align: center; font-size: 13px; color: var(--text-muted); }
.dl-task { padding: 12px; border-bottom: 1px solid var(--border-subtle); }
.dl-task:last-child { border-bottom: none; }
.dl-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.dl-name { flex: 1; font-size: 12px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dl-badge { font-size: 11px; font-weight: 500; }
.dl-ok { color: #3a9d5e; }
.dl-err { color: var(--color-error); }
.dl-btn {
  background: none; border: 1px solid var(--border-subtle); border-radius: 5px;
  font-size: 11px; color: var(--text-secondary); cursor: pointer; padding: 2px 8px; white-space: nowrap;
}
.dl-btn:hover { color: var(--color-error); border-color: var(--color-error); }
.dl-retry:hover { color: var(--color-accent); border-color: var(--color-accent); }
.dl-bar { height: 3px; border-radius: 999px; background: var(--border-subtle); margin-bottom: 4px; overflow: hidden; }
.dl-bar-fill { height: 100%; border-radius: 999px; background: var(--color-accent); transition: width 0.25s ease; }
.dl-info { font-size: 10px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.dl-err-text { color: var(--color-error); }

.dl-d-enter-active, .dl-d-leave-active { transition: all 0.18s ease; }
.dl-d-enter-from, .dl-d-leave-to { opacity: 0; transform: translateY(-6px); }
</style>