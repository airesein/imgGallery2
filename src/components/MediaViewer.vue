<script setup>
import { computed, ref, watch, inject } from 'vue'
import { useFavorites } from '../composables/useFavorites.js'

const props = defineProps({ item: Object })
const emit = defineEmits(['close', 'fullscreen'])
const { isFav, toggle } = useFavorites()

const getItemUrl = inject('getItemUrl')
const isVideoFn = inject('isVideo')
const getItemDownload = inject('getItemDownload')

const isVideo = computed(() => isVideoFn(props.item))
const favored = computed(() => isFav(props.item))
const fullLoaded = ref(false)
const displayFailed = ref(false)
const retryCount = ref(0)
const MAX_RETRIES = 3
const retryTimer = ref(null)

const coverUrl = computed(() => getItemUrl(props.item, 'cover'))
const displayUrl = computed(() => {
  const base = getItemUrl(props.item, 'display')
  if (retryCount.value === 0) return base
  const sep = base.includes('?') ? '&' : '?'
  return base + sep + '_retry=' + retryCount.value + '_' + Date.now()
})
const rawUrl = computed(() => getItemUrl(props.item, 'raw'))

watch(() => props.item, () => {
  fullLoaded.value = false
  displayFailed.value = false
  retryCount.value = 0
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
          @load="fullLoaded = true"
          @error="onDisplayError"
        />
        <div v-else class="vw-error">
          <div>预览加载失败</div>
          <button class="vw-btn" @click.stop="download">直接下载查看</button>
        </div>
      </template>
      <video v-else :src="displayUrl" class="vw-media" controls autoplay @click.stop />

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
  color: rgba(255,255,255,0.5); font-size: 14px;
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
  background: rgba(10,10,10,0.55);
  border: 1px solid rgba(255,255,255,0.12);
  color: #e6e6e6;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.vw-btn:hover { background: rgba(24,24,24,0.72); color: #fff; }
.vw-btn.active { color: #f0c040; border-color: rgba(240,192,64,0.4); }

@media (max-width: 600px) {
  .vw-actions { left: 10px; right: 10px; bottom: 10px; }
  .vw-btn { flex: 1; min-width: 0; padding: 8px 10px; }
}
</style>
