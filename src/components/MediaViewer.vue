<script setup>
import { computed, ref, watch, inject, onUnmounted } from 'vue'
import { useFavorites } from '../composables/useFavorites.js'
import { useSwCache } from '../composables/useSwCache.js'

const props = defineProps({ item: Object })
const emit = defineEmits(['close', 'fullscreen'])
const { isFav, toggle } = useFavorites()

const getItemUrl = inject('getItemUrl')
const isVideoFn = inject('isVideo')
const getItemDownload = inject('getItemDownload')
const sw = useSwCache()

const isVideo = computed(() => isVideoFn(props.item))
const favored = computed(() => isFav(props.item))
const fullLoaded = ref(false)
const displayFailed = ref(false)
const retryCount = ref(0)
const MAX_RETRIES = 3
const retryTimer = ref(null)
const displayProgress = ref(0)
let progressTimer = null

const coverUrl = computed(() => getItemUrl(props.item, 'cover'))
const displayUrl = computed(() => {
  const base = getItemUrl(props.item, 'display')
  if (retryCount.value === 0) return base
  const sep = base.includes('?') ? '&' : '?'
  return base + sep + '_retry=' + retryCount.value + '_' + Date.now()
})
const rawUrl = computed(() => getItemUrl(props.item, 'raw'))

function startProgress() {
  clearProgress()
  displayProgress.value = 0
  function tick() {
    if (displayProgress.value >= 90) return
    const inc = Math.max(1, (90 - displayProgress.value) * 0.12 + Math.random() * 3)
    displayProgress.value = Math.min(90, displayProgress.value + inc)
    progressTimer = setTimeout(tick, 150 + Math.random() * 200)
  }
  progressTimer = setTimeout(tick, 80)
}

function clearProgress() {
  if (progressTimer) {
    clearTimeout(progressTimer)
    progressTimer = null
  }
}

function finishProgress() {
  clearProgress()
  displayProgress.value = 100
  setTimeout(() => {
    if (displayProgress.value === 100) displayProgress.value = 0
  }, 400)
}

function onDisplayLoad() {
  finishProgress()
  fullLoaded.value = true
}

watch(() => props.item, () => {
  fullLoaded.value = false
  displayFailed.value = false
  retryCount.value = 0
  if (retryTimer.value) clearTimeout(retryTimer.value)
  startProgress()
  const dl = displayUrl.value
  const raw = rawUrl.value
  const urls = [dl, raw].filter(Boolean)
  if (urls.length) sw.setPriority(urls, 5)
}, { immediate: true })

onUnmounted(() => {
  clearProgress()
  if (retryTimer.value) clearTimeout(retryTimer.value)
})

function onDisplayError() {
  if (displayFailed.value) return
  if (retryTimer.value) clearTimeout(retryTimer.value)
  
  if (retryCount.value < MAX_RETRIES) {
    retryCount.value++
    const delay = 800 * retryCount.value
    retryTimer.value = setTimeout(() => {
      if (!displayFailed.value) displayFailed.value = false
    }, delay)
  } else {
    displayFailed.value = true
    fullLoaded.value = true
  }
}

function download() {
  const dlType = getItemDownload(props.item)
  if (dlType === 'js') {
    downloadViaJs(rawUrl.value)
  } else {
    window.open(rawUrl.value, '_blank', 'noopener')
  }
}

async function downloadViaJs(url) {
  try {
    const r = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    if (!r.ok) throw new Error(`HTTP_${r.status}`)
    const blob = await r.blob()
    const u = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = u
    a.download = url.split('?')[0].split('/').pop() || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(u)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

function onBackdrop() {
  emit('close')
}
</script>

<template>
  <div class="vw-overlay" @click="onBackdrop">
    <div class="vw-stage">
      <template v-if="!isVideo">
        <img
          v-if="!displayFailed"
          :src="coverUrl"
          :class="['vw-media', 'vw-cover', { hidden: fullLoaded }]"
          alt=""
        />
        <img
          v-if="!displayFailed"
          :key="retryCount"
          :src="displayUrl"
          :class="['vw-media', 'vw-full', { loaded: fullLoaded }]"
          alt=""
          @load="onDisplayLoad"
          @error="onDisplayError"
        />
        <div v-else class="vw-error">
          <div>预览加载失败</div>
          <button class="vw-btn" @click.stop="download">直接下载查看</button>
        </div>
      </template>
      <video v-else :src="displayUrl" class="vw-media" controls autoplay @click.stop />

      <div v-if="displayProgress > 0 && displayProgress < 100" class="vw-progress">
        <div class="vw-progress-bar" :style="{ width: displayProgress + '%' }"></div>
      </div>

      <div class="vw-actions" @click.stop>
        <button class="vw-btn" @click="download">下载</button>
        <button v-if="!isVideo" class="vw-btn" @click="emit('fullscreen')">全屏</button>
        <button :class="['vw-btn', { active: favored }]" @click="toggle(item)">{{ favored ? '已收藏' : '收藏' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vw-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.92);
  display: flex; align-items: center; justify-content: center;
  padding: 14px;
}

.vw-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(92vw, 1440px);
  height: min(88vh, 960px);
  overflow: hidden;
  border-radius: 8px;
}

.vw-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.vw-cover {
  object-fit: cover;
  filter: blur(14px) saturate(1.08);
  transform: scale(1.08);
  opacity: 1;
  transition: opacity 0.18s ease;
}

.vw-cover.hidden { opacity: 0; }

.vw-full {
  opacity: 0;
  transition: opacity 0.26s ease;
}

.vw-full.loaded { opacity: 1; }

.vw-error {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px;
  color: var(--color-loading-text); font-size: 14px;
}

.vw-progress {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 52px;
  height: 3px;
  border-radius: 999px;
  background: rgba(0,0,0,0.3);
  overflow: hidden;
  z-index: 5;
}

.vw-progress-bar {
  height: 100%;
  border-radius: 999px;
  background: var(--color-accent);
  transition: width 0.25s ease-out;
}

.vw-actions {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.vw-btn {
  background: var(--bg-overlay);
  border: 1px solid rgba(30,32,34,0.08);
  color: var(--text-body);
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.vw-btn:hover { background: rgba(252,251,250,0.85); color: var(--text-primary); }
.vw-btn.active { color: var(--color-accent); border-color: var(--border-active); }

@media (max-width: 600px) {
  .vw-actions { left: 10px; right: 10px; bottom: 10px; }
  .vw-btn { flex: 1; min-width: 0; padding: 8px 10px; }
}
</style>
